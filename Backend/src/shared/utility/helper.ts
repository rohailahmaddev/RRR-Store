
import {ApiError} from "./ApiError.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../../infrastructure/storage/cloudinary.storage.js";
import { getAccessToken, getRefreshToken } from "../auth/jwt.js";
import crypto from "crypto"
import { prisma } from "../../config/database.js";
import { cartItemList, productVariantsList, uploadImagesList, userSelect } from "../types/index.types.js";
import { env } from "../../config/env.js";
import { Decimal, TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import bcrypt from "bcrypt";
import { getErrorMessage } from "./tryCatchError.js";
import ms from "ms"

export const hashToken = (token:string):string => {    
  return crypto.createHmac("sha256",env.TEMPORARY_TOKEN_SECRET).update(token).digest("hex");
}

export const hashPassword = async (password:string):Promise<string> => {
  const hashedPassword = await bcrypt.hash(password,10)
  return hashedPassword;
}

export const comparePassword = async (newPassword:string, userPassword:string):Promise<boolean> => {
  const isPassword = await bcrypt.compare(newPassword,userPassword)
  return isPassword;
}

export const revokeTokenChain = async (tokenId:number) => {

  const row = await prisma.refresh_tokens.findUnique({
    where:{id:tokenId},
    select:{
        id:true,
        replaced_by:true,
    }
  })

  if (!row) return;

  await prisma.refresh_tokens.update({
    where:{ id:tokenId },
    data:{
        is_revoked:true
    }
  })

  if (row.replaced_by) {
    await revokeTokenChain(row.replaced_by);
  }
}

export const getAccessAndRefreshToken = async (userId:number, userAgent:string, userIp:string | null, oldTokenId: number|null = null):Promise<{accessToken:string, refreshToken:string}> => {

  const user = await prisma.users.findUnique({
    where:{id:userId},
    select:userSelect
   })

  if (!user) {
    throw new ApiError(404, `User with id ${userId} not found`, undefined);
  }

  try {

    const accessToken = getAccessToken(user);
    const refreshToken = getRefreshToken(user)
    const refreshTokenExpiryMs = ms(env.REFRESH_TOKEN_EXPIRY as any);
    const refreshTokenExpiry = new Date(Date.now() + refreshTokenExpiryMs);

    await prisma.$transaction( async (tx) => {
        const insertedRow = await tx.refresh_tokens.create({
            data:{
                user_id:userId,
                token_hash:refreshToken, 
                user_agent:userAgent, 
                ip_address:userIp, 
                expire_at:refreshTokenExpiry
             }
        })

        // Rotation: retire the old token, point it at the new one
        if (oldTokenId) {
            await tx.refresh_tokens.update({
                where:{id:oldTokenId},
                data:{
                    is_revoked:true,
                    replaced_by:insertedRow.id
                 }
            })         
        }
    })

    return { accessToken, refreshToken };

  } catch (error) {
    const message = error instanceof Error ? error.message: String(error)
    throw new ApiError(500, `Something went wrong. ${message}`)
  }
}

export const getCartSubtotal = async (tx:TransactionClient, cartId:number) => {
  //change prisma with tx when call it
  const result = await prisma.cart_items.findMany({
    where:{cart_id:cartId},
    select:{
      quantity:true,
      product:{
        select:{
          price:true
        }
      }
    }
  })

  const subTotal = calculateSubTotal(result)
  const totalItems = calculateQuantity(result)

  return { subTotal, totalItems };
}

export const calculateSubTotal = (result:cartItemList) => {
  const subtotal = result.reduce(
    (sum, item) => sum.plus(item.product.price.times(item.quantity)), new Decimal(0) 
  ).toNumber()
  return subtotal;
}

export const calculateQuantity = (result:cartItemList) => {
  const totalItems = result.reduce((sum, item) => sum + item.quantity, 0)
  return totalItems;
}

export const validateVariantsArray = (product_variants:productVariantsList)=> {
    const productVariants = product_variants.length > 0 ? 
        product_variants.map((variant) => {
            return {
            size_name: variant.size_name,
            color: variant.color,
            stock: variant.stock,
            };
        }): [{ size_name: "Standard", color: "Default", stock: 0 }];
    return productVariants;
}

export const parseJson = (ele?:string):[] => {
  let Array:[]
  try {
    Array = JSON.parse(ele || "[]");
  } catch (error) {
    throw new ApiError(400, `Invalid data format ${getErrorMessage(error)}`);
  }

  return Array;
}
