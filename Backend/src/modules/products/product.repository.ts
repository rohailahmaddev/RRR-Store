import { prisma } from "../../config/database.js"
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import { productVariantsList, uploadImagesList } from "../../shared/types/index.types.js";
import { createProducts } from "./product.types.js";



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

export const getProductById = async(productId:number) => {
    return await prisma.products.findUnique({
        where:{id:productId}
    })
}

export const updateProduct = async ( productId: number, data: any, tx: any ) => {
  return tx.products.update({
    where: {
      id: productId,
    },
    data,
  });
};

export const getProductImagePublicIds = async ( productId: number, imageIds: number[] ) => {
  return prisma.product_images.findMany({
    where: {
      id: {
        in: imageIds,
      },
      product_id: productId,
    },
    select: {
      public_id: true,
    },
  });
};

export const deleteProductImages = async ( productId: number, imageIds: number[], tx: any ) => {
  return tx.product_images.deleteMany({
    where: {
      product_id: productId,
      id: {
        in: imageIds,
      },
    },
  });
};

export const insertProductImages = async ( productId: number, images: any[], tx: any ) => {
  return tx.product_images.createMany({
    data: images.map((img, index) => ({
      product_id: productId,
      image_url: img.url,
      public_id: img.public_id,
      is_primary: index === 0,
    })),
  });
};

export const getProductByQuery = async ( query: any, params: any[] ) => {
  return prisma.$queryRawUnsafe(query, ...params);
}

export const getProductCount = async ( query: any, params: any[] ) => {
  return prisma.$queryRawUnsafe(query, ...params);
}

export const getSingleProduct = async( productId:number ) => {
 const query = `
        SELECT products.id, products.sku, products.name, products.description, products.price, products.rating, products.rating_count, 
        c.name AS category_name, c.id AS category_id,

        (SELECT CONCAT(
            '[', 
            GROUP_CONCAT(
                JSON_OBJECT(
                    'size_name', pv.size_name,'color', pv.color, 'stock', pv.stock)
            ), 
            ']'
            )
            FROM product_variants pv
            WHERE pv.product_id = products.id
        ) AS product_variants,

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
  `
  return getProductByQuery(query,[productId])
}

export const getProductCategoryIdByProductId = async( productId:number ) => {
  return prisma.products.findUnique({
    where:{id:productId},
    select:{
      name:true,
      category_id:true
    }
  })
}

export const getRelatedProducts = async( categoryId:number|null, productId:number, productName:string ) => {
  const query = `SELECT products.id, products.sku, products.name, products.description, products.price, products.rating,
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
    WHERE products.category_id = ? AND products.id != ? AND products.name LIKE ? AND products.is_active = true 
    ORDER BY products.rating ASC 
    LIMIT 10`

  return getProductByQuery(query,[categoryId,productId,`%${productName}%`])
}