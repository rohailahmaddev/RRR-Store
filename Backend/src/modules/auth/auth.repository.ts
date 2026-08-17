import { prisma } from "../../config/database.js"
import { userSelect } from "../../shared/types/index.types.js"
import { registerCreateUser } from "./auth.types.js";

export const getUserByEmailRepo = async (email:string)=> {
    const user = await prisma.users.findUnique({
        where:{email:email},
        select:userSelect
    })
    return user;
}

export const updateVerificationEmailTokenRepo = async (userId:number,verifyToken:string, verifyTokenExpiry:Date) => {
    const result = await prisma.users.update({
        where:{id:userId},
        data:{
            verify_token:verifyToken,
            verify_token_expiry:verifyTokenExpiry
        }
    })

    return result;
}

export const createUser = async ({full_name, email, password, phone, imageUrl, hashedToken, tokenExpiry }:registerCreateUser) => {
    const result = await prisma.users.create({
        data:{
            full_name:full_name,
            email:email,
            password:password,
            phone:phone,
            avatar_url:imageUrl,
            verify_token:hashedToken,
            verify_token_expiry:tokenExpiry            
        }
    })

    return result;
}

