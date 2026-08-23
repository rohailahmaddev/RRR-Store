import { prisma } from "../../config/database.js"
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import { productVariantsList, uploadImagesList } from "../../shared/types/index.types.js";
import { createProducts } from "./product.types.js";

export const insertCategory = async(categoryName:string,slug:string,tx:TransactionClient) =>{
    const result = await prisma.categories.create({
        data:{
            name:categoryName,
            slug:slug,
        }
    })
    return result;
}

export const getCategoryByName = async(categroyName:string,tx:TransactionClient) => {
    const result = await prisma.categories.findMany({
        where:{name:categroyName}
    })

    return result
}

export const createProduct = async({productName, description, price, categoryId,sku,tx}:createProducts) =>{
    const result = await tx.products.create({
        data:{
            sku:sku,
            name:productName,
            description:description,
            price:price,
            category_id:categoryId
        }
    })

    return result;
}

export const createProductImages = async(productId:number,imagesLocalPaths:uploadImagesList, tx:TransactionClient)=>{
    await tx.product_images.createMany({
        data:imagesLocalPaths.map((img,index) => ({
            product_id:productId,
            image_url:img?.url,
            public_id:img?.public_id,
            is_primary:index === 0,
        }))
    })
}

export const createProductVariants = async(productId:number, productVariants:productVariantsList,tx:TransactionClient) => {
    await tx.product_variants.createMany({
        data:productVariants.map((variant)=>({
            product_id:productId,
            size_name:variant.size_name,
            color:variant.color,
            stock:variant.stock
        }))
    })
}