import pool from "../db/index.db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { deleteFromCloudinary } from "../utils/Cloudinary.js";
import { uploadImagesOnCloudinary } from "../utils/helper.js";

// find and insert categories
const insertCategories = async (connection, category_name) => {
    let categoryId;

    const [existingCategory] = await connection.query(
        `SELECT id FROM categories WHERE name = ?`,
        [category_name]
    );

    if (existingCategory.length > 0) {

        categoryId = existingCategory[0].id;

    } else {

        const slug = category_name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

        //insert category
        const [newCategory] = await connection.query(
            `INSERT INTO categories (name, slug) VALUES (?, ?)`,
            [category_name, slug]
        );
        categoryId = newCategory.insertId;
    }
    return categoryId
}

export const addProduct = asyncHandler(async (req, res) => {

    const { product_name, description, price, category_name, sku } = req.body;
    const product_sizes = JSON.parse(req.body.product_sizes);

    if (!product_name || !description || !price || !category_name || !sku) {
        throw new ApiError(402, "All fields required");
    }

    if (!Array.isArray(product_sizes) || product_sizes.length === 0) {
        throw new ApiError(400, "At least one product size is required");
    }

    const imageLocalPaths = req.files?.images?.map((file) => file.path) || [];

    if (imageLocalPaths.length === 0) {
        throw new ApiError(400, "At least one image is required");
    }

    let uploadedImages = [];
    try {
        uploadedImages = await uploadImagesOnCloudinary(imageLocalPaths)
    } catch (error) {
        throw new ApiError(504, `Failed to upload product images. ${error.message}`);
    }

    const connection = await pool.getConnection()
    try {

        await connection.beginTransaction();

        const categoryId = await insertCategories(connection, category_name)

        //insert product
        const [productResult] = await connection.query(
            `INSERT INTO products (sku, name, description, price, category_id) VALUES (?, ?, ?, ?, ?)`,
            [sku, product_name, description, price, categoryId]
        );
        const insertedProductId = productResult.insertId

        //insert images
        for (const img of uploadedImages) {
            await connection.query(
                `INSERT INTO product_images (product_id, image_url, public_id, is_primary) VALUES (?, ?, ?, ?)`,
                [insertedProductId, img?.url, img.public_id, img === uploadedImages[0]]
            );
        }

        //insert product sizes
        for (const size of product_sizes) {
            await connection.query(
                `INSERT INTO product_sizes (product_id, size_name, stock) VALUES(?,?,?)`,
                [insertedProductId, size.size_name, size.stock]
            )
        }

        await connection.commit()

        return res
            .status(201)
            .json(new ApiResponse(201, "Product created successfully", { insertedProductId }))

    } catch (error) {

        await connection.rollback();

        //delete images form cloudinary after failure
        if (uploadedImages.length > 0) {
            await Promise.all(
                uploadedImages.map((img) => deleteFromCloudinary(img.public_id))
            )
        }


        throw new ApiError(500, `Failed to create product. ${error.message}`);

    } finally {
        connection.release();
    }

})

export const getProducts = asyncHandler(async (req, res) => {

    const { page = 1, limit = 20, search_name, categoryId, min_price, max_price, sort_by } = req.query;
    let query = `
    SELECT products.id, products.sku, products.name, products.description, products.price, products.rating,
    products.rating_count,
    categories.name AS category_name,

    (
        SELECT image_url 
        FROM product_images 
        WHERE product_images.product_id = products.id 
          AND product_images.is_primary = true 
        LIMIT 1
    ) AS image_url

    FROM products
    LEFT JOIN categories
    ON categories.id = products.category_id

    WHERE products.is_active = true 
    `
    const param = []

    if (search_name) {
        query += ` AND products.name LIKE ?`;
        param.push(`%${search_name}%`);
    }

    //filter by category
    if (categoryId) {
        query += ` AND category_id = ?`
        param.push(categoryId)
    }

    //filter by min_price
    if (min_price) {
        query += ` AND price >= ?`
        param.push(min_price)
    }

    //filter by max_price
    if (max_price) {
        query += ` AND price <= ?`
        param.push(max_price)
    }

    const sortMap = {
        price_asc: "price ASC",
        price_desc: "price DESC",
        newest: "created_at DESC",
        rating: "rating DESC",
    };

    query += ` ORDER BY ${sortMap[sort_by] || "products.created_at DESC"}`
    const offset = (Number(page) - 1) * Number(limit)

    query += ` LIMIT ? OFFSET ? `
    param.push(Number(limit), offset)

    const [products] = await pool.query(query, param)

    let count_query = `SELECT COUNT(*) AS total FROM products WHERE is_active = true `
    const count_param = []

    if (categoryId) {
        count_query += `AND category_id = ?`
        count_param.push(categoryId)
    }

    //count by min_price
    if (min_price) {
        count_query += `AND price >= ?`
        count_param.push(min_price)
    }

    //filter by max_price
    if (max_price) {
        count_query += `AND price <= ?`
        count_param.push(max_price)
    }

    const [count_result] = await pool.query(count_query, count_param)
    const total_products = count_result[0].total

    return res
        .status(200)
        .json(new ApiResponse(200, "Products fetched successfully", {
            products,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total_products / limit),
                total_products,
                limit: Number(limit),
            },
        }))

})

export const getSingleProduct = asyncHandler(async (req, res) => {

    const { id: product_id } = req.params;

    const [rows] = await pool.query(`
        SELECT products.id, products.sku, products.name, products.description, products.price, products.rating, products.rating_count, 
        c.name AS category_name,

        (SELECT CONCAT(
            '[', 
            GROUP_CONCAT(
                JSON_OBJECT(
                    'size_name', ps.size_name, 'stock', ps.stock)
            ), 
            ']'
            )
            FROM product_sizes ps
            WHERE ps.product_id = products.id
        ) AS sizes,

        (SELECT CONCAT(
            '[',
            GROUP_CONCAT(
                JSON_OBJECT(
                    'image_url', pi.image_url,
                    'is_primary', pi.is_primary
                )
            ),
            ']'
        ) 
           FROM product_images pi
           WHERE pi.product_id = products.id 
        )AS images,

        COALESCE(
            (SELECT 
                CONCAT(
                    '[',
                    GROUP_CONCAT(
                        JSON_OBJECT(
                            'username', u.full_name,
                            'avatar',u.avatar_url,
                            'rating', r.rating,
                            'comment', r.comment
                        )
                    ),
                    ']'
                ) 
               FROM reviews r
               INNER JOIN users u
               ON u.id = r.user_id
               WHERE r.product_id = products.id 
            ), 
            '[]'
        )AS comments

        FROM products 
        LEFT JOIN categories c
        ON c.id = products.category_id
        
        WHERE products.id = ?  AND products.is_Active = true
        `, [product_id])

    if (rows.length === 0) {
        throw new ApiError(404, "Product not found")
    }

    const product = rows[0]

    product.sizes = product.sizes ? JSON.parse(product.sizes) : [];
    product.images = product.images ? JSON.parse(product.images) : [];

    return res
        .status(201)
        .json(new ApiResponse(200, "Product fetched successfully", product))

})

export const deactivateProductListing = asyncHandler(async (req, res) => {
    const { id: product_id } = req.params;

    const [rows] = await pool.query(
        `SELECT id, is_active FROM products WHERE id = ?`,
        [productId]
    );

    if (rows.length === 0) {
        throw new ApiError(404, "Product not found");
    }

    if (!rows[0].is_active) {
        throw new ApiError(400, "Product listing is already deactivated");
    }

    await pool.query(`UPDATE products SET is_active = false WHERE id = ?`, [product_Id]);

    return res
        .status(200)
        .json(new ApiResponse(200, "Product listing is deactivated successfully"));

})

export const activateProductListing = asyncHandler(async (req, res) => {
    const { id: product_id } = req.params;

    const [rows] = await pool.query(
        `SELECT id, is_active FROM products WHERE id = ?`,
        [productId]
    );

    if (rows.length === 0) {
        throw new ApiError(404, "Product not found");
    }

    if (rows[0].is_active) {
        throw new ApiError(400, "Product listing is already activated");
    }

    await pool.query(`UPDATE products SET is_active = true WHERE id = ?`, [product_Id]);

    return res
        .status(200)
        .json(new ApiResponse(200, "Product listing activated successfully"));
})

export const getDeactivatedProductListing = asyncHandler(async (req, res) => {
    const [deactivated_products] = await pool.query(`
        SELECT products.id, products.sku, products.name, products.description, products.price, products.rating,
        products.rating_count,
        categories.name AS category_name,

        (SELECT image_url 
            FROM product_images
            WHERE product_images.product_id = products.id 
              AND product_images.is_primary = true 
            LIMIT 1
        ) AS image_url

        FROM products
        LEFT JOIN categories
        ON categories.id = products.category_id

        WHERE products.is_active = false 
    `)

    return res
        .stats(200)
        .json(new ApiResponse(200, "Products fetched successfully", deactivated_products))

})

export const updateProductListing = asyncHandler(async (req, res) => {

    const { id: product_id } = req.params;

    console.log(req.body)
    const { product_name, description, price, category_name, sku } = req.body;

    const [rows] = await pool.query(`
        SELECT * FROM products WHERE id = ?
        `, [product_id])

    if (rows.length === 0) {
        throw new ApiError(404, "No product found");
    }

    const fieldToUpdate = {}

    if (sku !== undefined) fieldToUpdate.sku = sku;
    if (product_name !== undefined) fieldToUpdate.name = product_name;
    if (description !== undefined) fieldToUpdate.description = description;
    if (price !== undefined) fieldToUpdate.price = price;

    const product_sizes = req.body.product_sizes ? JSON.parse(req.body.product_sizes) : null;
    const deletedImageIds = req.body.deleted_image_ids ? JSON.parse(req.body.deleted_image_ids) : [];

    const imageLocalPaths = req.files?.images?.map((file) => file.path) || [];

    let uploadedImages = [];
    try {
        uploadedImages = await uploadImagesOnCloudinary(imageLocalPaths)
    } catch (error) {
        throw new ApiError(504, `Failed to upload product images. ${error.message}`);
    }

    let deletedImage_public_id = [];
    if (deletedImageIds.length > 0) {
        const [img_public_id] = await pool.query(`
            SELECT public_id FROM product_images WHERE id IN(?)
            `, [deletedImageIds])
        deletedImage_public_id = img_public_id
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction()

        let categoryId = await insertCategories(connection, category_name)

        if (Object.keys(fieldToUpdate).length > 0) {
            const setClause = Object.keys(fieldToUpdate).map((k) => `${k} = ?`).join(", ")
            const [result] = await pool.query(`
                UPDATE products SET ${setClause}, category_id = ? WHERE id = ?
                `, [...Object.values(fieldToUpdate), categoryId, product_id]
            )
        }

        //delete image form database
        if (deletedImageIds.length > 0) {
            await connection.query(
                `DELETE FROM product_images WHERE id IN (?) AND product_id = ?`,
                [deletedImageIds, product_id]
            );
        }

        //insert new image url
        if (uploadedImages.length > 0) {
            for (const img of uploadedImages) {
                await connection.query(
                    `INSERT INTO product_images (product_id, image_url, public_id, is_primary) VALUES (?,?, ?, ?)`,
                    [product_id, img?.url, img.public_id, img === uploadedImages[0]]
                );
            }
        }

        // Replace sizes, if provided
        if (product_sizes && Array.isArray(product_sizes)) {
            for (const size of product_sizes) {
                await connection.query(
                    `INSERT INTO product_sizes (product_id, size_name, stock) 
               VALUES (?, ?, ?) 
               ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
                    [product_id, size.size_name, size.stock]
                );
            }
        }

        await connection.commit();

        if (deletedImage_public_id.length > 0) {
            await Promise.all(deletedImage_public_id.map((img) => deleteFromCloudinary(img.public_id)));
        }

        return res
            .status(200)
            .json(new ApiResponse(200, "Product updated successfully"));

    } catch (error) {

        await connection.rollback();

        if (uploadedImages.length > 0) {
            await Promise.all(uploadedImages.map((img) => deleteFromCloudinary(img.public_id)));
        }

        throw new ApiError(500, `Failed to update product. ${error.message}`);
    } finally {
        connection.release();
    }

})

export const deleteProductSize = asyncHandler(async (req, res) => {

    const { id: product_id } = req.params;
    const { size_name } = req.body;

    if (!size_name) {
        throw new ApiError(400, "Size is required")
    }

    const [rows] = await pool.query(`
        DELETE FROM product_sizes WHERE product_id = ? AND size_name = ?
    `, [product_id, size_name])

    if(rows.affectedRows === 0){
        throw new ApiError(404, "Size not found for this product");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Size deleted successfully"))

})

export const setReviews = asyncHandler(async (req, res) => {

    const user_id = req.user.id;
    const { id: product_id } = req.params;
    const { rating, comment = null } = req.body;
    const finalComment = comment?.trim() || null;

    if (!rating) {
        throw new ApiError(401, "Rating is required")
    }

    if (rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }

    const connection = await pool.getConnection()


    try {
    
        await connection.beginTransaction()
    
        const [result] = await connection.query(`
            INSERT INTO reviews (user_id, product_id, rating, comment) VALUES( ?, ?, ?, ?) 
        `, [user_id, product_id, rating, finalComment])
        
        if(result.affectedRows === 0){
            throw new ApiError(401, "Fail to insert")
        }

        const [product] = await connection.query(`
            SELECT COALESCE( AVG(rating), 0) AS average_rating,
            COUNT(*) AS total_ratings
            FROM reviews WHERE product_id
        `, [product_id])
        
        const average_rating = product[0].average_rating;
        const total_rating = product[0].total_ratings;
        
        await connection.query(`
            UPDATE products SET rating =?, rating_count = ? WHERE id = ?
        `, [average_rating, total_rating, product_id])
        
        await connection.commit();
        
        return res
            .status(200)
            .json(new ApiResponse(200, "Comment posted successfully"))
            
    } catch (error) {
        await connection.rollback();

        if (error instanceof ApiError) {
            throw error;
        }

        if (error.code === "ER_DUP_ENTRY") {
            throw new ApiError(
                409,
                "You have already submitted a review for this product"
            );
        }

        throw new ApiError(
            500,
            `Failed to insert review. ${error.message}`
        );
    } finally {
        connection.release()
    }

})

export const updateReviews = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { id:product_id } = req.params;
  const { new_rating, comment = null } = req.body;

  const finalComment = comment?.trim() || null;

  if (!new_rating) {
    throw new ApiError(400, "Rating is required");
  }

  if (new_rating < 1 || new_rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      `UPDATE reviews SET rating = ?, comment = ? WHERE product_id = ? AND user_id = ?`,
      [new_rating, finalComment, product_id, user_id]
    );

    if (updateResult.affectedRows === 0) {
      throw new ApiError(404, "Review not found");
    }

    const [rows] = await connection.query(
      `SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS total_rating 
       FROM reviews WHERE product_id = ?`,
      [product_id]
    );

    const { average_rating, total_rating } = rows[0];

    await connection.query(
      `UPDATE products SET rating = ?, rating_count = ? WHERE id = ?`,
      [average_rating, total_rating, product_id]
    );

    await connection.commit();

    return res
      .status(200)
      .json(new ApiResponse(200, "Review updated successfully"));
  } catch (error) {
    await connection.rollback();
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Failed to update review. ${error.message}`);
  } finally {
    connection.release();
  }
});

export const deleteReviews = asyncHandler(async (req, res) => {

    const user_id = req.user.id;
    const { id: product_id } = req.params;

    const connection = await pool.getConnection()

    try {

        await connection.beginTransaction()
        
        
        const [deleteResult] = await connection.query(`
            DELETE FROM reviews WHERE product_id = ? AND user_id = ?
        `, [product_id, user_id])

        if (deleteResult.affectedRows === 0) {
            throw new ApiError(404, "Review not found");
        }
    
        const [product] = await connection.query(`
            SELECT COALESCE( AVG(rating), 0) AS average_rating,
            COUNT(*) AS total_rating FROM reviews WHERE product_id = ?
        `, [product_id])
    
        const average_rating = product[0].average_rating;
        const total_rating = product[0].total_rating;
    
        await connection.query(`
            UPDATE products SET rating = ?, rating_count = ? WHERE id = ?
        `, [average_rating, total_rating, product_id])
    
        await connection.commit()

        return res
            .status(200)
            .json(new ApiResponse(200, "Review deleted successfully"))

    } catch (error) {

        await connection.rollback();
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Failed to delete review. ${error.message}`);
        
    } finally {
        connection.release()
    }
})

export const createCategory = asyncHandler(async (req, res) => {
    const { name:category_name } = req.body;

    if (!category_name?.trim()) {
        throw new ApiError(400, "Category name is required");
    }

    const name = category_name.trim();

    const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const [result] = await pool.query(
        `
        INSERT INTO categories (name, slug)
        VALUES (?, ?)
        `,
        [name, slug]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(500, "Failed to create category");
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            "Category created successfully",
            {
                id: result.insertId,
                name,
                slug
            }
        )
    );
});

export const getAllCategories = asyncHandler(async (req, res) => {
    const [categories] = await pool.query(`
        SELECT id, name, slug
        FROM categories
        ORDER BY name ASC
    `);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Categories fetched successfully",
                categories
            )
        );
});

export const updateCategory = asyncHandler(async (req, res) => {
    const { id: categoryId } = req.params;
    const { name:category_name } = req.body;

    if (!category_name?.trim()) {
        throw new ApiError(400, "Category name is required");
    }

    const name = category_name.trim();

    const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const [result] = await pool.query(
        `
        UPDATE categories
        SET name = ?, slug = ?
        WHERE id = ?
        `,
        [name, slug, categoryId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Category not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            "Category updated successfully",
            {
                id: categoryId,
                name,
                slug
            }
        )
    );
});

export const deleteCategory = asyncHandler(async (req, res) => {
    const { id: categoryId } = req.params;

    const [result] = await pool.query(
        `
        DELETE FROM categories
        WHERE id = ?
        `,
        [categoryId]
    );

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Category not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            "Category deleted successfully",
            null
        )
    );
});
//search & discovery

// export const searchProduct = asyncHandler(async(req, res) => {
//     const { page = 1, limit = 10, search_name, categoryId, max_price, min_price, rating } = req.query;

//     let query = `
//         SELECT p.name,p.sku, p.price, p.rating, p.rating_count,
//         c.name AS categroy_name,

//         (
//             SELECT pi.image_url
//             FROM product_image pi
//             WHERE pi.poduct_id = p.id AND is_primary = true
//             LIMIT 1
//         ) AS image_url

//         FROM products p
//         LEFT JOIN categories c 
//         ON p.category_id = c.id  
//         WHERE p.is_active = true
//     `

//     const param = []

//     //filter by product name
//     if(search_name){
//         query += `AND p.name = ?`
//         param.push(search_name)
//     }
//     //filter by category
//     if (categoryId) {
//         query += ` AND category_id = ?`
//         param.push(categoryId)
//     }

//     //filter by min_price
//     if (min_price) {
//         query += ` AND price >= ?`
//         param.push(min_price)
//     }

//     //filter by max_price
//     if (max_price) {
//         query += ` AND price <= ?`
//         param.push(max_price)
//     }

//     const sortMap = {
//         price_asc: "price ASC",
//         price_desc: "price DESC",
//         newest: "created_at DESC",
//         rating: "rating DESC",
//     };

//     query += ` ORDER BY ${sortMap[sort_by] || "products.created_at DESC"}`
//     const offset = (Number(page) - 1) * Number(limit)

//     query += ` LIMIT ? OFFSET ? `
//     param.push(Number(limit), offset)

//     const [products] = await pool.query(query, param)

//     let count_query = `SELECT COUNT(*) AS total FROM products WHERE is_active = true `
//     const count_param = []

//     if (categoryId) {
//         count_query += `AND category_id = ?`
//         count_param.push(categoryId)
//     }

//     //count by min_price
//     if (min_price) {
//         count_query += `AND price >= ?`
//         count_param.push(min_price)
//     }

//     //filter by max_price
//     if (max_price) {
//         count_query += `AND price <= ?`
//         count_param.push(max_price)
//     }

//     const [count_result] = await pool.query(count_query, count_param)
//     const total_products = count_result[0].total

//     return res
//         .status(200)
//         .json(new ApiResponse(200, "Products fetched successfully", {
//             products,
//             pagination: {
//                 currentPage: Number(page),
//                 totalPages: Math.ceil(total_products / limit),
//                 total_products,
//                 limit: Number(limit),
//             },
//         }))

// })