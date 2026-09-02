import { prisma } from "../../config/database.js"
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js"
import { productVariantsList } from "../../shared/types/index.types.js"

export const createProductVariants = async(productId:number, productVariants:productVariantsList,tx:TransactionClient = prisma) => {
    await tx.product_variants.createMany({
        data:productVariants.map((variant)=>({
            product_id:productId,
            size_name:variant.size_name,
            color:variant.color,
            stock:variant.stock
        }))
    })
}

export const updateProductVariants = async ( productId: number, variants: any[], tx: TransactionClient = prisma ) => {
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

export const deleteProductVariant = async ( productId: number, variantId: number, tx: TransactionClient = prisma ) => {
  return await tx.product_variants.deleteMany({
    where: {
      id: variantId,
      product_id: productId,
    }
  });
};

export const getProductVariantsByProductId = async ( productId: number, tx: TransactionClient = prisma ) => {
  return await tx.product_variants.findMany({
    where: {
      product_id: productId
    }
  });
};
