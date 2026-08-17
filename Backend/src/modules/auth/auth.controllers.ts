import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { userRegisterService } from "./auth.services.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";

export const registerUserController = asyncHandler( async (req:Request, res: Response) => {
    const { full_name, email, password, phone } = req.body;
        
    const avatarLocalPath = (req as any).file?.avatar?.path;
    
    const result = await userRegisterService({
        full_name, 
        email, 
        password, 
        phone, 
        req, 
        avatarLocalPath
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        "Verification Email sent to your registered email. Please verify your email.",
        result
    ))
    
}) 