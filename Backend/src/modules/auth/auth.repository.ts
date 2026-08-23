import { prisma } from "../../config/database.js"
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import { authUser, registerCreateUser } from "./auth.types.js";

export const getUserByEmailRepo = async (email: string) => {

    const user = await prisma.users.findUnique({
        where: { email: email },
        select: authUser
    })

    return user;
}

export const getUserById = async (id: number) => {
    const user = await prisma.users.findUnique({
        where: { id: id }
    })
    return user;
}

export const updateVerificationEmailTokenRepo = async (userId: number, verifyToken: string, verifyTokenExpiry: Date) => {
    const result = await prisma.users.update({
        where: { id: userId },
        data: {
            verify_token: verifyToken,
            verify_token_expiry: verifyTokenExpiry
        }
    })

    return result;
}

export const createUser = async ({ full_name, email, hashedPassword, phone, imageUrl, hashedToken, tokenExpiry }: registerCreateUser) => {
    const result = await prisma.users.create({
        data: {
            full_name: full_name,
            email: email,
            password: hashedPassword,
            phone: phone,
            avatar_url: imageUrl,
            verify_token: hashedToken,
            verify_token_expiry: tokenExpiry
        }
    })

    return result;
}

export const verifyEmailRepo = async (hashedToken: string) => {
    const user = await prisma.users.update({
        where: {
            verify_token: hashedToken,
            verify_token_expiry: {
                gt: new Date(),
            },
        },
        data: {
            is_verified: true
        }
    })

    return user;
}

export const lockedUserAccount = async (id: number, failed_attempts: number, locked_min: number) => {
    await prisma.users.update({
        where: { id: id },
        data: {
            failed_login_attempts: failed_attempts,
            locked_until: new Date(Date.now() + locked_min * 60 * 1000),
        },
    });
}

export const updateFailedAttempts = async (id: number, failed_attempts: number) => {
    await prisma.users.update({
        where: { id: id },
        data: {
            failed_login_attempts: failed_attempts,
        },
    });
}

export const unlockUserAccount = async (id: number) => {
    await prisma.users.updateMany({
        where: {
            id: id,
            locked_until: {
                lt: new Date(),
            }
        },
        data: {
            failed_login_attempts: 0,
            locked_until: null,
        },
    });
}

export const logoutUser = async (refreshToken: string) => {
    await prisma.refresh_tokens.updateMany({
        where: { token_hash: refreshToken },
        data: {
            is_revoked: true,
        }
    })
}

export const selectRefreshToken = async (refreshToken: string) => {
    const result = await prisma.refresh_tokens.findMany({
        where: {
            token_hash: refreshToken,
        }
    })

    return result;
}

export const revokeRefreshToken = async (hashedRefreshToken: string) => {
    await prisma.refresh_tokens.updateMany({
        where: { token_hash: hashedRefreshToken },
        data: { is_revoked: true }
    })
}

export const updateForgotPasswordToken = async (userId: number, hashedToken: string, tokenExpiry: Date) => {

    const result = await prisma.users.update({
        where: { id: userId },
        data: {
            reset_token: hashedToken,
            reset_token_expiry: tokenExpiry
        }
    })
    return result;
}

export const getUserByResetPasswordToken = async (hashedToken: string) => {
    const result = await prisma.users.findMany({
        where: {
            reset_token: hashedToken,
            reset_token_expiry: {
                lt: new Date(),
            }
        }
    })

    return result;
}

export const updateUserPasswordById = async (userId: number, newPassword: string) => {
    await prisma.users.update({
        where: { id: userId },
        data: { password: newPassword }
    })
}

export const deactivateUser = async (userId: number, tx: TransactionClient) => {
    await tx.users.update({
        where: { id: userId },
        data: { is_active: false }
    })
}

export const revokeAllActiveRefreshTokensById = async (userId: number, tx: TransactionClient) => {
    const result = await prisma.refresh_tokens.updateMany({
        where: {
            user_id: userId,
            is_revoked: false
        },
        data: {
            is_revoked: true,
        }
    })

    return result;
}

export const activateUser = async (userId: number, tx: TransactionClient) => {
    await tx.users.update({
        where: { id: userId },
        data: { is_active: true }
    })
}
