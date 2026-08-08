import { Parser } from "json2csv";
import pool from "../db/index.db.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import fs from "fs";
import csvParser from "csv-parser";
import { insertCategories } from "./product.controllers.js";
import { validateVariantsArray } from "../utils/helper.js";
import ApiError from "../utils/ApiError.js";

export const exportProductCSV = asyncHandler(async (req, res) => {

    const [products] = await pool.query(`
        SELECT p.id, p.name, p.sku, p.price,
        c.name AS category_name,
        p.is_active,
        (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = p.id) AS total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id ASC
    `)

    if (products.length === 0) {
        throw new Error("No products found to export.");
    }

    const fields = ["id", "name", "sku", "description", "price", "category_name", "is_active", "total_stock"];
    const parser = new Parser({ fields });
    const csv = parser.parse(products);

    res.header("Content-Type", "text/csv");
    res.attachment(`products-export-${Date.now()}.csv`);
    res.send(csv);

})

export const exportPrductVariantCSV = asyncHandler(async (req, res) => {

    const [variants] = await pool.query(`
        SELECT p.id, p.name, p.sku, p.price, p.rating, p.rating_count,
        pv.size_name, pv.color, pv.stock,
        c.name AS category_name, 
        p.is_active
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        ORDER BY p.id ASC, pv.size_name ASC
    `);

    if (variants.length === 0) {
        throw new ApiErrorError("No product variants found to export.");
    }

    const fields = ["id", "name", "sku", "price", "rating", "rating_count", "category_name", "is_active", "size_name", "color", "stock"];
    const parser = new Parser({ fields });
    const csv = parser.parse(variants);

    res.header("Content-Type", "text/csv");
    res.attachment(`product-variants-${Date.now()}.csv`);
    res.send(csv);
})

export const importProductCSV = asyncHandler(async (req, res) => {
    const filePath = req.file?.path;

    if (!filePath) {
        throw new Error("CSV file is required");
    }

    const rows = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", (row) => rows.push(row))
            .on("end", resolve)
            .on("error", reject)
    })

    fs.unlinkSync(filePath);

    if(rows.length === 0) {
        throw new Error("CSV file is empty");
    }

    //validate the csv data
    const errors = [];
    rows.forEach((row, index) => {
        if(!row.product_name || !row.sku || !row.product_price || !row.product_category) {
            errors.push(`Row ${index + 1} missing fields required e.i (product_name, sku, product_price, product_category).`);
        }
        if(row.product_price && isNaN(parseFloat(row.product_price))) {
            errors.push(`Row ${index + 1} has an invalid product price.`);
        }
        if(row.product_stock && isNaN(parseInt(row.product_stock))){
            errors.push(`Row ${index + 1} has an invalid product stock.`);
        }
    })

    if(errors.length > 0) {
        throw new ApiError(400, `CSV validation failed:${errors.join(" ")}`);
    }


    const productMap = new Map();
    for(const row of rows) {

        if(!productMap.has(row.sku)){
            productMap.set(row.sku, {
                product_name: row.product_name,
                product_sku: row.sku,
                product_price: parseFloat(row.product_price),
                product_description: row.product_description || null,
                product_category: row.product_category || null,
                variants: []
            })
        }

        if(row.product_stock !== undefined && row.product_stock !== "") {
            productMap.get(row.sku).variants.push({
                size_name: row.product_size || "Standard",
                color: row.product_color || "Default",
                stock: parseInt(row.product_stock) || 0
            })
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for(const product of productMap.values()) {

            //find category id by name

            let categoryId= await insertCategories(connection, product.product_category);


            const [existingProduct] = await connection.query(`
                SELECT id FROM products WHERE sku = ?
            `, [product.product_sku]);

            let productId
            if(existingProduct.length > 0) {
                productId = existingProduct[0].id;
                const [updatedProduct] = await connection.query(`
                    UPDATE products SET name = ?, price = ?, description = ?, category_id = ?
                    WHERE id = ?
                `, [product.product_name, product.product_price, product.product_description, categoryId, productId]);
            } else {
                const [insertedProduct] = await connection.query(`
                INSERT INTO products (name, sku, price, description, category_id)
                VALUES (?, ?, ?, ?, ?)
                `, [product.product_name, product.product_sku, product.product_price, product.product_description, categoryId]);
                productId = insertedProduct.insertId;
            }

            const productVariants = product.variants.length > 0 ? product.variants : [{ size_name: "Standard", color: "Default", stock: 0 }];
            for(const variant of productVariants) {
                await connection.query(`
                    INSERT INTO product_variants (product_id, size_name, color, stock)  
                    VALUES(?,?,?,?)
                `, [productId, variant.size_name, variant.color, variant.stock])
            }
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw new ApiError(500, `Failed to import products from CSV ${error}`);
    } finally {
        connection.release();
    }

    res.status(200).json(200, "All products imported successfully from CSV file" );
})