import pool from "../db/index.db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { deleteFromCloudinary } from "../utils/Cloudinary.js";
import { uploadImagesOnCloudinary } from "../utils/helper.js";


export const addProduct = asyncHandler(async (req, res) => {

    const { product_name, description, price, category_name, sku } = req.body;
    const product_sizes = JSON.parse(req.body.product_sizes);

    if (!product_name || !description || !price || !category_name || !sku) {
        throw new ApiError(402, "All fields required");
    }

    if (!Array.isArray(product_sizes) || product_sizes.length === 0) {
        throw new ApiError(400, "At least one product size is required");
    }

    const imageLocalPaths = req.files?.image_url?.map((file) => file.path) || [];

    if (imageLocalPaths.length === 0) {
        throw new ApiError(400, "At least one image is required");
    }

    let uploadedImages;
    try {
        uploadedImages = await uploadImagesOnCloudinary(imageLocalPaths)
    } catch (error) {
        throw new ApiError(504, `Failed to upload product images. ${error.message}`);
    }

    const connection = await pool.getConnection()
    try {

        await connection.beginTransaction();

        // --- Find or create category ---
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

        //insert product
        const [productResult] = await connection.query(
            `INSERT INTO products (sku, name, description, price, category_id) VALUES (?, ?, ?, ?, ?)`,
            [sku, product_name, description, price, categoryId]
        );
        const insertedProductId = productResult.insertId

        //insert images
        for (const img of uploadedImages) {
            await connection.query(
                `INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)`,
                [insertedProductId, img?.url, img === uploadedImages[0]]
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

        //delete images form cloudinary after failure
        if (uploadedImages.length > 0) {
            await Promise.all(
                uploadedImages.map((img) => deleteFromCloudinary(img.public_id))
            )
        }

        await connection.rollback();
        throw new ApiError(500, `Failed to create product. ${error.message}`);

    } finally {
        connection.release();
    }

})

export const getProducts = asyncHandler(async (req, res) => {

    const { page = 1, limit = 20, categoryId, min_price, max_price, sort_by } = req.query;
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

        (SELECT CONCAT('[', GROUP_CONCAT(
              JSON_OBJECT('size_name', ps.size_name, 'stock', ps.stock)
            ), ']')
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
        )AS images

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

export const deactivateProductListing = asyncHandler( async (req, res) => {
    const {id: product_id} = req.params;

    const [rows] = await pool.query(
      `SELECT id, is_active FROM products WHERE id = ?`,
      [productId]
    );

    if (rows.length === 0) {
      throw new ApiError(404, "Product not found");
    }

    if (!rows[0].is_active) {
      throw new ApiError(400, "Product is already deleted");
    }

    await pool.query(`UPDATE products SET is_active = false WHERE id = ?`, [product_Id]);

    return res
    .status(200)
    .json(new ApiResponse(200, "Product deleted successfully"));

})