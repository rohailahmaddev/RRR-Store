import { prisma } from "../../config/database.js"
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js"
import { productVariants } from "../../shared/types/index.types.js"
import { importCSVType } from "./csv.types.js"

export const exportCSVData = async() => {
    return await prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.price,
        c.name AS category_name,
        p.is_active,
        (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = p.id) AS total_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id ASC
    `
}

export const exportProductVariantsCSV = async() => {
    return await prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.price, p.rating, p.rating_count,
        pv.size_name, pv.color, pv.stock,
        c.name AS category_name, 
        p.is_active
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.id
        ORDER BY p.id ASC, pv.size_name ASC
    `
}

export const getExistingProductBySku = async(sku:string,tx:TransactionClient) => {
    return await tx.products.findUnique({
        where:{sku:sku}
    })
}

export const updateExistingProduct = async (productId:number, product:importCSVType, categoryId:number, tx:TransactionClient) => {
    await tx.products.update({
        where:{id:productId},
        data:{
            name:product.productName,
            sku:product.sku,
            description:product.description,
            price:product.price,
            category_id:categoryId,
        }
    })
}

export const createProductByCSV = async(product:importCSVType,categoryId:number, tx:TransactionClient) => {
    return await tx.products.create({
        data:{
            name:product.productName,
            sku:product.sku,
            description:product.description,
            price:product.price,
            category_id:categoryId,
        }
    })
}

export const createProductVariantsByCSV = async(variant:productVariants,productId:number, tx:TransactionClient) => {
    await tx.product_variants.create({
        data:{
            product_id:productId,
            size_name:variant.size_name,
            color:variant.color,
            stock:variant.stock
        }
    })
}