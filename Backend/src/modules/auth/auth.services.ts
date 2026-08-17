import type { Request } from "express"
import { sendVerificationEmail } from "../../infrastructure/email/email.services.js"
import { getTemporaryToken } from "../../shared/auth/jwt.js"
import { ApiError } from "../../shared/utility/ApiError.js"
import { createUser, getUserByEmailRepo, updateVerificationEmailTokenRepo } from "./auth.repository.js"
import { User } from "../../shared/types/index.types.js"
import { registerUserInput } from "./auth.types.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../../infrastructure/storage/cloudinary.storage.js"
import { getErrorMessage } from "../../shared/utility/tryCatchError.js"
import { UploadApiResponse } from "cloudinary";

const sendEmailService = async (user:User, req:Request) =>{
    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    
    try {
       await updateVerificationEmailTokenRepo(user.id,hashedToken,tokenExpiry)
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }

    await sendVerificationEmail(user, req, unHashedToken)
}

const uploadAvatarImage = async (avatarLocalPath:string):Promise<UploadApiResponse> => {

    try {

      return await uploadOnCloudinary(avatarLocalPath)
  
    } catch (error) {
      throw new ApiError(502, `Failed to upload avatar image. ${getErrorMessage(error)}`)
    }
}

export const userRegisterService = async({
    full_name,
    email, 
    password,
    phone, 
    req, 
    avatarLocalPath}:registerUserInput)=>{
    
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

    let avatarImage : UploadApiResponse | null = null;
    if(avatarLocalPath){
       avatarImage = await uploadAvatarImage(avatarLocalPath)
    }

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    const imageUrl = avatarImage?.url ?? null;

    let result;
    try {
        result = await createUser({full_name, email, password, phone, imageUrl, hashedToken, tokenExpiry })
    } catch (error) {
        if(avatarImage?.public_id){
            await deleteFromCloudinary(avatarImage.public_id)
        }
        throw new ApiError(500,`Failed to create the user. ${getErrorMessage(error)}`)
    }    

    const insertedUser = {
        id:result.id,
        full_name:result.full_name,
        email:result.email,
        phone:result.phone,
    };

    await sendVerificationEmail(insertedUser, req, unHashedToken);

    return insertedUser;
}