import { ApiError } from "../../shared/utility/ApiError.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { createProductByCSV, createProductVariantsByCSV, exportCSVData, exportProductVariantsCSV, getExistingProductBySku, updateExistingProduct } from "./csv.repository.js"
import fs from "fs";
import csvParser from "csv-parser";
import { Parser } from "json2csv";
import { auditLogs } from "../logs/logs.services.js";
import { Request } from "express";
import { importCSVList } from "./csv.types.js";
import { prisma } from "../../config/database.js";
import { insertCategoriesService } from "../categories/categories.services.js";

export const exportCSVServices = async(req:Request)=> {

    let result;
    try {
        result = await exportCSVData();
    } catch (error) {
        throw new ApiError(500,`Failed to get CSV data ${getErrorMessage(error)}`)
    }

    if (Array.isArray(result) && result.length === 0) {
        throw new Error("No products found to export.");
    }

    const fields = ["id", "name", "sku", "description", "price", "category_name", "is_active", "total_stock"];
    const parser = new Parser({ fields });
    let csv;
    if(Array.isArray(result)){
        csv = parser.parse(result);
    }
    

    //create audit logs
    await auditLogs({
      userId: req.user?.id ?? 0,
      action: "EXPORT_SIMPLE_CSV",
      entityType: "CSV",
      entityId: null,
      details: { export_csv: "Export simple products csv" },
      ipAddress: req.ip,
    });

    return csv;

}

export const exportProductVariantsCSVServices = async(req:Request) => {
     let result;
    try {
        result = await exportProductVariantsCSV();
    } catch (error) {
        throw new ApiError(500,`Failed to get CSV data ${getErrorMessage(error)}`)
    }

    if (Array.isArray(result) && result.length === 0) {
        throw new Error("No products found to export.");
    }

    const fields = ["id", "name", "sku", "price", "rating", "rating_count", "category_name", "is_active", "size_name", "color", "stock"];
    const parser = new Parser({ fields });
    let csv;
    if(Array.isArray(result)){
        csv = parser.parse(result);
    }
    

    //create audit logs
    await auditLogs({
      userId: req.user?.id ?? 0,
      action: "EXPORT_PRODUCT_VARIANTS_CSV",
      entityType: "CSV",
      entityId: null,
      details: { export_csv: "Export products variants csv" },
      ipAddress: req.ip,
    });

    return csv;
}

export const importCSVServices = async(req:Request, filePath:string | undefined) => {

    if(!filePath){
        throw new Error("CSV file is required");
    }

    const rows:importCSVList = [];

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
    const errors:string[] = [];
    rows.forEach((row, index) => {
        if(!row.productName || !row.sku || !row.price || !row.categoryName) {
            errors.push(`Row ${index + 1} missing fields required e.i (product_name, sku, product_price, product_category).`);
        }
        if(row.price && isNaN(Number(row.price))){
            errors.push(`Row ${index + 1} has an invalid product price.`);
        }
        if(row.stock && isNaN(Number(row.stock))){
            errors.push(`Row ${index + 1} has an invalid product stock.`);
        }
    })

    if(errors.length > 0) {
        throw new ApiError(400, `CSV validation failed:${errors.join(" ")}`);
    }


    //map the products
    const productMap = new Map();
    for(const row of rows) {

        if(!productMap.has(row.sku)){
            productMap.set(row.sku, {
                productName: row.productName,
                sku: row.sku,
                price:Number( row.price),
                description: row.description || null,
                categoryName: row.categoryName || null,
                variants: []
            })

        }
        if(row.stock !== undefined) {
            productMap.get(row.sku).variants.push({
                size_name: row.size_name || "Standard",
                color: row.color || "Default",
                stock: Number(row.stock) || 0
            })
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
        for (const product of productMap.values()) {
            const categoryId = await insertCategoriesService(product.categoryName, tx);
            const existingProduct = await getExistingProductBySku(product.sku, tx);
            let productId
            if(existingProduct?.id){
                productId = existingProduct.id
                await updateExistingProduct(productId,product,categoryId,tx);

            } else {
                const createdProduct = await createProductByCSV(product,categoryId,tx);
                productId = createdProduct.id;
                const productVariants = product?.variants?.length > 0 ? product.variants : [{ size_name: "Standard", color: "Default", stock: 0 }];
                for(const variant of productVariants) {
                    await createProductVariantsByCSV(variant,productId,tx)
                }
            }
        }
        })
    } catch (error) {
        throw new ApiError(500, `Failed to import the product CSV.${getErrorMessage(error)}`)
    }

    await auditLogs({ 
        userId: req?.user?.id ?? 0, 
        action: "IMPORT_PRODUCT_CSV", 
        entityType: "CSV", 
        entityId: null, 
        details: { 
            import_csv: "Products imported from CSV file", 
            products_imported: productMap.size, 
        }, 
        ipAddress: req.ip, 
    });

    return;

}
