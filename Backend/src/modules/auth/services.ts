import type { Request } from "express"
import { sendVerificationEmail } from "../../infrastructure/email/email.services.js"
import { getTemporaryToken } from "../../shared/auth/jwt.js"
import { ApiError } from "../../shared/utility/ApiError.js"
import { getUserByEmailRepo, UpdateverificationEmailTokenRepo } from "./repository.js"
import { User } from "../../shared/types/index.types.js"

const sendEmailService = async (user:User, req:Request) =>{
    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    
    try {
       await UpdateverificationEmailTokenRepo(user.id,hashedToken,tokenExpiry)
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }

    await sendVerificationEmail(user, req, unHashedToken)
}

export const userRegisterService = async(email:string, req:Request)=>{
    const existingUser = await getUserByEmailRepo(email)

    if(existingUser){
        if (existingUser.is_verified) {
            throw new ApiError(409, "User already exist. Please login.")
        }

        if (!existingUser.is_verified) {
            await sendEmailService(existingUser,req);
            throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
        }

    }




    return user;
}