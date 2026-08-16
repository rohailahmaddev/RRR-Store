
import {ApiError} from "./ApiError.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../../infrastructure/storage/cloudinary.storage.js";
import { getAccessToken, getRefreshToken } from "../auth/jwt.js";
import crypto from "crypto"
import { prisma } from "../../config/database.js";
import { userSelect } from "../types/index.types.js";
import { env } from "../../config/env.js";
import { Decimal, TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import bcrypt from "bcrypt";

export const hashToken = (token:string):string => {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const hashPassword = async (password:string):Promise<string> => {
  const hashedPassword:string = await bcrypt.hash(password,10)
  return hashedPassword;
}

export const comparePassword = async (newPassword:string, userPassword:string):Promise<boolean> => {
  const isPassword:boolean = await bcrypt.compare(newPassword,userPassword)
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

export const getAccessAndRefreshToken = async (userId:number, userAgent:string, userIp:string, oldTokenId: number|null = null):Promise<object> => {

  const user = await prisma.users.findUnique({
    where:{id:userId},
    select:userSelect
   })

  if (!user) {
    throw new ApiError(404, `User with id ${userId} not found`);
  }

  try {

    const accessToken = getAccessToken(user);
    const refreshToken = getRefreshToken(user)

    const hashedRefreshToken = hashToken(refreshToken);
    const expiresAt = env.REFRESH_TOKEN_EXPIRY;

    await prisma.$transaction( async (tx) => {
        const insertedRow = await tx.refresh_tokens.create({
            data:{
                user_id:userId, 
                token_hash:hashedRefreshToken, 
                user_agent:userAgent, 
                ip_address:userIp, 
                expire_at:expiresAt}
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

export const uploadImagesOnCloudinary = async (filesLocalPath: string[] = []):Promise<object[]> => {

  if(filesLocalPath.length === 0) return []

  console.log(filesLocalPath)
  
  let uploadResult = await Promise.allSettled(
    filesLocalPath.map((filePath) => uploadOnCloudinary(filePath))
  )

  let upload:Array<{
    url:string,
    public_id:string
  }> = [];

  let failed:string[] = [] ;

  uploadResult.forEach((result, index) => {

    if(result.status === "fulfilled" && result.value){
      upload.push(result.value)
    } else {
      const fp = filesLocalPath[index];
      if (fp) failed.push(fp);
    }
  
  });

  if(failed.length>0){
    await Promise.all(
    upload.map((img) => deleteFromCloudinary(img.public_id))
  )

    throw new ApiError(500,`Failed to upload ${failed.length} image(s)`);
  }

  return upload

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

  const subtotal = result.reduce(
    (sum, item) => sum.plus(item.product.price.times(item.quantity)), new Decimal(0) )
  const totalItems = result.reduce((sum, item) => sum + item.quantity, 0)

  return { subtotal, totalItems };
}

export const validateVariantsArray = (product_variants:{stock?:number, size_name:string, color:string}[])=> {
    const productVariants = product_variants.length > 0 ? 
        product_variants.map((variant, index) => {
            if (variant.stock === undefined) {
                 throw new ApiError(400, `Variant at index ${index} has an invalid or missing stock value`);
            }
            return{
            size_name: variant.size_name || "Standard",
            color: variant.color || "Default",
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
    const message = error instanceof Error?error.message:String(error)
    throw new ApiError(400, `Invalid data format ${message}`);
  }

  return Array;
}