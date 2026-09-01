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

export const updateProductVariants = async ( productId: number, variants: any[], tx: any ) => {
  for (const variant of variants) {
    await tx.product_variants.upsert({
      where: {
        product_id_size_name_color: {
          product_id: productId,
          size_name: variant.size_name,
          color: variant.color,
        },
      },
      update: {
        stock: variant.stock,
      },
      create: {
        product_id: productId,
        size_name: variant.size_name,
        color: variant.color,
        stock: variant.stock,
      },
    });
  }
};

export const getProductByQuery = async ( query: any, params: any[] ) => {
  return prisma.$queryRawUnsafe(query, ...params);
}

export const getProductCount = async ( query: any, params: any[] ) => {
  return prisma.$queryRawUnsafe(query, ...params);
}
