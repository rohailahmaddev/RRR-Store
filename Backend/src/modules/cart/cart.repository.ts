import { prisma } from "../../config/database.js"
import { cartItemInput } from "./cart.types.js"

export const findCart = async (userId:number) => {
    return prisma.cart.findUnique({
        where:{
            user_id:userId
        }
    })
}

export const createCart = async (userId:number) => {
    return prisma.cart.create({
        data:{
            user_id:userId
        }
    })
}

export const insertItems = async ({productId, productVariantId, quantity, cartId}:cartItemInput) => {
    return prisma.$queryRaw`
        INSERT INTO cart_items ( cart_id, product_id, product_variant_id, quantity ) 
        VALUES( ${cartId}, ${productId}, ${productVariantId}, ${quantity})
        ON DUPLICATE KEY UPDATE quantity = quantity + ${quantity}    
    `
}

export const getCartItems = async (cartId:number) => {
    return prisma.$queryRaw`
        SELECT 
        ci.id AS cart_item_id,
        ci.product_id,
        ci.quantity,
        ci.product_variant_id,
        p.name, 
        p.sku, 
        p.price,
        pv.size_name,
        ( SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id AND pi.is_primary = true
         limit 1        
        ) AS image_url
        From cart_items ci 
        INNER JOIN products p
        ON ci.product_id = p.id
        LEFT JOIN product_variants pv
        ON pv.id = ci.product_variant_id
        WHERE p.is_active = true AND ci.cart_id = ${cartId}
    `
}