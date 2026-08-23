import type { Request, Response } from "express"
import { sendFogotPasswordEmail, sendVerificationEmail } from "../../infrastructure/email/email.services.js"
import { getTemporaryToken } from "../../shared/auth/jwt.js"
import { ApiError } from "../../shared/utility/ApiError.js"
import { activateUser, createUser, deactivateUser, getUserByEmailRepo, getUserById, getUserByResetPasswordToken, lockedUserAccount, logoutUser, revokeAllActiveRefreshTokensById, revokeRefreshToken, selectRefreshToken, unlockUserAccount, updateFailedAttempts, updateForgotPasswordToken, updateUserPasswordById, updateVerificationEmailTokenRepo, verifyEmailRepo } from "./auth.repository.js"
import { User } from "../../shared/types/index.types.js"
import { loginUser, registerUserInput } from "./auth.types.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../../infrastructure/storage/cloudinary.storage.js"
import { getErrorMessage } from "../../shared/utility/tryCatchError.js"
import { UploadApiResponse } from "cloudinary";
import { comparePassword, getAccessAndRefreshToken, hashPassword, hashToken, revokeTokenChain } from "../../shared/utility/helper.js"
import { prisma } from "../../config/database.js"
import { auditLogs } from "../logs/logs.services.js"

const sendEmailService = async (user: User, req: Request) => {
    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

    try {
        await updateVerificationEmailTokenRepo(user.id, hashedToken, tokenExpiry)
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }

    await sendVerificationEmail(user, req, unHashedToken)
}

const uploadAvatarImage = async (avatarLocalPath: string): Promise<UploadApiResponse> => {

    try {
        return await uploadOnCloudinary(avatarLocalPath)
    } catch (error) {
        throw new ApiError(502, `Failed to upload avatar image. ${getErrorMessage(error)}`)
    }
    
}

export const userRegisterService = async ({
    full_name,
    email,
    password,
    phone,
    req,
    avatarLocalPath }: registerUserInput) => {

    const existingUser = await getUserByEmailRepo(email)

    if (existingUser) {
        if (existingUser.is_verified) {
            throw new ApiError(409, "User already exist. Please login.")
        }

        if (!existingUser.is_verified) {
            await sendEmailService(existingUser, req);
            throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
        }

    }

    let avatarImage: UploadApiResponse | null = null;
    if (avatarLocalPath) {
        avatarImage = await uploadAvatarImage(avatarLocalPath)
    }

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    const imageUrl = avatarImage?.url ?? null;
    const hashedPassword = await hashPassword(password)

    let result;
    try {
        result = await createUser({ full_name, email, hashedPassword, phone, imageUrl, hashedToken, tokenExpiry })
    } catch (error) {
        if (avatarImage?.public_id) {
            await deleteFromCloudinary(avatarImage.public_id)
        }
        throw new ApiError(500, `Failed to create the user. ${getErrorMessage(error)}`)
    }

    const insertedUser = {
        id: result.id,
        full_name: result.full_name,
        email: result.email,
        phone: result.phone,
    };

    await sendVerificationEmail(insertedUser, req, unHashedToken);

    return insertedUser;
}

export const verifyEmailService = async (unhashedToken: string) => {

    if (unhashedToken.trim() === '') {
        throw new ApiError(402, "Token is not present. Please resend verification email")
    }

    const hashedToken = hashToken(unhashedToken)

    let result;
    try {
        result = await verifyEmailRepo(hashedToken)
    } catch (error) {
        throw new ApiError(400, `Invalid user or verification time is over. Please request a new verification email.`)
    }

    const verifiedUser = {
        id: result.id,
        full_name: result.full_name,
        email: result.email,
        phone: result.phone,
    }
    return verifiedUser;
}

export const resendVerificationEmailService = async (email: string, req: Request) => {

    if (email.trim() === '') {
        throw new ApiError(402, "Please provide register email for resend verification email.")
    }

    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw new ApiError(400, "Invalid email. Please register first.")
    }

    if (user.is_verified) {
        throw new ApiError(409, "User already verified. Please login.")
    }

    if (!user.is_active) {
        throw new ApiError(403, "Your account is blocked please contact support service.")
    }

    await sendEmailService(user, req)

    return null;
}

const passwordCheckService = async (password: string, user: loginUser) => {

    const isPasswordMatch = await comparePassword(password, user.password)

    const MAX_ATTEMPT = 5;
    const LOCKED_MINUTES = 59;
    if (!isPasswordMatch) {
        let failedAttempts = user.failed_login_attempts + 1;
        if (failedAttempts >= MAX_ATTEMPT) {
            try {
                await lockedUserAccount(user.id, failedAttempts, LOCKED_MINUTES);
            } catch (error) {
                throw new ApiError(500, "Something went wrong while locking the account");
            }
            throw new ApiError(401, `Invalid password account is locked please try again after 59 minutes.`);

        } else {
            try {

                await updateFailedAttempts(user.id, failedAttempts)

            } catch (error) {
                throw new ApiError(500, "Something went wrong");
            }

            throw new ApiError(401, `Invalid password remaining attempts ${MAX_ATTEMPT - failedAttempts}`)
        }

    } else {

        try {
            await unlockUserAccount(user.id)
        } catch (error) {
            throw new ApiError(500, "Something went wrong");
        }

    }

    return isPasswordMatch;

}

export const loginUserService = async (email: string, password: string, req: Request) => {

    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw new ApiError(400, "Invalid email. Please register first.")
    }

    if (!user.is_active) {
        throw new ApiError(403, "Your account is blocked please contact support service.")
    }

    //validate locked account
    if (user.locked_until) {
        if (new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            throw new ApiError(429, `Account temporarily locked. Try again in ${minutesLeft} minute(s).`)
        } else {
            await unlockUserAccount(user.id)
        }
    }

    const isPasswordMatch = await passwordCheckService(password, user)

    if (isPasswordMatch) {
        if (!user.is_verified) {
            await sendEmailService(user, req);
            throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
        }
        const userAgent = req.headers["user-agent"] ?? "";
        const ipAddress = req.ip ?? "";
        const { accessToken, refreshToken } = await getAccessAndRefreshToken(user.id, userAgent, ipAddress);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        };

        const loggedInUser = {
            full_name: user.full_name,
            email: user.email,
        };

        return { loggedInUser, cookieOptions, accessToken, refreshToken };
    }
}

export const logoutUserService = async (accessToken: string, refreshToken: string) => {
    if (!accessToken || accessToken.trim() === '' || !refreshToken || refreshToken.trim() === '') {
        throw new ApiError(400, "No tokens found in cookies")
    }

    const hashedRefreshToken = hashToken(refreshToken)

    try {
        await logoutUser(hashedRefreshToken)
    } catch (error) {
        throw new ApiError(500, "Failed to logout.")
    }

}

export const reshfreshTokenService = async (refreshToken: string, req: Request, res: Response) => {
    if (!refreshToken || refreshToken.trim() === '') {
        throw new ApiError(400, "No refresh token found in cookies")
    }

    console.log(refreshToken)
    let result;
    try {
        result = await selectRefreshToken(refreshToken)
    } catch (error) {
        throw new ApiError(500, "Failed to refresh the token.")
    }

    if (result.length === 0) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        throw new ApiError(401, "Invalid refresh token");
    }

    if (result[0]?.is_revoked) {
        await revokeTokenChain(result[0].id);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        throw new ApiError(401, "Token reuse detected, session revoked");
    }

    if (result[0]?.expire_at && new Date(result[0].expire_at) < new Date()) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        throw new ApiError(401, "Refresh token expired");
    }



    let user;
    try {
        if (result[0]?.user_id) {
            user = await getUserById(result[0]?.user_id)
        }

    } catch (error) {
        throw new ApiError(500, "Failed the fetch the user.")
    }

    if (!user) {
        throw new ApiError(401, "Invalid user.")
    }

    //validate locked account
    if (user.locked_until) {
        if (new Date(user.locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
            throw new ApiError(429, `Account temporarily locked. Try again in ${minutesLeft} minute(s).`)
        } else {
            await unlockUserAccount(user.id)
        }
    }

    const userId = result[0]?.user_id;
    const oldTokenId = result[0]?.id;
    const userAgent = req.headers["user-agent"] ?? '';
    const ipAddress = req.ip ?? '';
    const { accessToken, refreshToken: newRefreshToken } = await getAccessAndRefreshToken(userId as number, userAgent, ipAddress, oldTokenId);

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return { accessToken, newRefreshToken, cookieOptions }

}

export const forgotPasswordService = async (email: string, req: Request) => {

    let user;
    try {
        user = await getUserByEmailRepo(email)
    } catch (error) {
        throw new ApiError(500, "Failed to fetch user info try again.")
    }

    if (!user) {
        throw new ApiError(401, "Invalid user.")
    }

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

    try {
        await updateForgotPasswordToken(user?.id, hashedToken, tokenExpiry);
    } catch (error) {
        throw new ApiError(500, "Failed to generate the tokens try again")
    }

    await sendFogotPasswordEmail(user, req, unHashedToken);

    return null;
}

export const resetPasswordService = async (unhashedToken: string, newPassword: string) => {
    const hashedToken = hashToken(unhashedToken)

    let user;
    try {
        user = await getUserByResetPasswordToken(hashedToken)
    } catch (error) {
        throw new ApiError(500, "Failed to found the user try again.")
    }

    if (user.length === 0) {
        throw new ApiError(400, "Invalid user or reset time is over. Please request a new password reset link.")
    }

    const hashedPassword = await hashPassword(newPassword)

    if (!user[0]?.id) {
        throw new ApiError(400, "Invalid user or reset time is over. Please request a new password reset link.")
    }

    try {
        await updateUserPasswordById(user[0]?.id, hashedPassword)
    } catch (error) {
        throw new ApiError(500, "Failed to update the password try again.")
    }

    return;

}

export const deactivateUserService = async (userId: number, req: Request) => {

    const adminId = req.user?.id;

    if (adminId === undefined) {
        throw new Error('Unauthorize admin');
    }

    let user;
    try {
        user = await getUserById(userId);
    } catch (error) {
        throw new ApiError(500, "Failed to fetch the user.")
    }

    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (user?.role === 'admin') {
        throw new ApiError(403, "Admin accounts cannot be deactivated.")
    }

    if (!user?.is_active) {
        throw new ApiError(400, "User account is already deactivated.")
    }

    try {
        await prisma.$transaction(async (tx) => {
            await deactivateUser(userId, tx);
            await revokeAllActiveRefreshTokensById(userId, tx);
        })
    } catch (error) {
        throw new ApiError(500, "Failed to deactivate the user account.")
    }

    //create audit logs
    await auditLogs({
        userId: adminId,
        action: "DEACTIVATE_USER",
        entityType: "users",
        entityId: Number(userId),
        details: { is_active: { from: user.is_active, to: false } },
        ipAddress: req?.ip,
    });


    return;
}

export const activateUserAccountService = async (userId: number, req: Request) => {

    const adminId = req.user?.id;

    if (adminId === undefined) {
        throw new Error('Unauthorize admin');
    }

    let user;
    try {
        user = await getUserById(userId);
    } catch (error) {
        throw new ApiError(500, "Failed to fetch the user.")
    }

    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    if (user?.role === 'admin') {
        throw new ApiError(403, "Admin cannot activate another admin.")
    }

    if (user?.is_active) {
        throw new ApiError(400, "User account is already activated.")
    }

    try {
        await prisma.$transaction(async (tx) => {
            await activateUser(userId, tx);
        })
    } catch (error) {
        throw new ApiError(500, "Failed to activate the user account.")
    }

    //create audit logs
    await auditLogs({
        userId: adminId,
        action: "ACTIVATE_USER",
        entityType: "users",
        entityId: Number(userId),
        details: { is_active: { from: user.is_active, to: true } },
        ipAddress: req?.ip,
    });


    return;
}
