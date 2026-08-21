import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { forgotPasswordService, loginUserService, logoutUserService, resendVerificationEmailService, resetPasswordService, reshfreshTokenService, userRegisterService, verifyEmailService } from "./auth.services.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";


export const registerUserController = asyncHandler( async (req:Request, res: Response) => {
    const { full_name, email, password, phone } = req.body;
        
    const avatarLocalPath = (req as any).file?.avatar?.path;
    
    const user = await userRegisterService({
        full_name, 
        email, 
        password, 
        phone, 
        req, 
        avatarLocalPath
    })

    return res
    .status(201)
    .json(new ApiResponse(
        201, 
        "Verification Email sent to your registered email. Please verify your email.",
        {user:user}
    ))
}) 

export const verifyEmailController = asyncHandler( async(req:Request, res:Response ) => {
    const { token: unhashedToken } = req.params;

    const verifiedUser = await verifyEmailService(unhashedToken as string);

    return res.status(200)
    .json(new ApiResponse(200, "User verified successfully. Please login to continue.", 
        {user:verifiedUser}
    ))
})

export const resendVerificationEmailController = asyncHandler( async(req:Request, res:Response) => {
    const {email} = req.body;
    await resendVerificationEmailService(email, req)
    return res
    .status(200)
    .json(new ApiResponse(200, "Verification email resent successfully. Please check your email for the verification link."))
}) 

export const loginUserController = asyncHandler(async(req:Request, res:Response) => {
    const {email, password} = req.body;

    const loginResult = await loginUserService(email, password, req);

    if (!loginResult) {
        throw new Error("Unable to log in user");
    }

    const { loggedInUser, cookieOptions, accessToken, refreshToken } = loginResult;

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions as any)
        .cookie("refreshToken", refreshToken, cookieOptions as any)
        .json(new ApiResponse(200, "User logged in successfully.", {
            user: loggedInUser,
            accessToken,
            refreshToken,
    }));
})

export const logoutUserController = asyncHandler(async(req:Request, res:Response) => {
    const {accessToken, refreshToken} = req.cookies;

    console.log({accessToken,refreshToken})

    await logoutUserService(accessToken, refreshToken)

    // Clear the cookies
    return res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, "Logout successfully"))

})

export const refreshTokenController = asyncHandler(async(req:Request, res:Response) => {
    const {refreshToken} = req.cookies;

    const result = await reshfreshTokenService(refreshToken,req, res)

    if(!result){
        throw new Error("Unable to refresh token");
    }

    const { accessToken, newRefreshToken , cookieOptions} = result;

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions as any)
        .cookie("refreshToken", newRefreshToken, cookieOptions as any)
        .json(new ApiResponse(200, "User logged in successfully.", {
            accessToken,
            newRefreshToken,
    }));
})

export const forgotPasswordController = asyncHandler(async(req:Request, res:Response) => {
    const { email } = req.body

    await forgotPasswordService(email, req)

    return res
    .status(200)
    .json(new ApiResponse(200, "Please check your email for the reset link."))
})

export const resetPasswordController = asyncHandler(async(req:Request, res:Response) => {
    const {token:unhashedToken} = req.params;
    const {newPassword} = req.body;

    await resetPasswordService(unhashedToken as string,newPassword)

    return res
    .status(200)
    .json(new ApiResponse(200, "Password reset successfully. Please login with your new password."))
})

