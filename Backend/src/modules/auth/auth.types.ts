import { Request } from "express";
import { Prisma } from "../../generated/prisma/client.js";

export interface registerUserInput {
    full_name: string,
    email: string,
    password: string,
    phone: string | null,
    req: Request,
    avatarLocalPath: string | null
}

export interface registerCreateUser {
    full_name: string,
    email: string,
    hashedPassword: string,
    phone: string | null,
    imageUrl: string | null
    hashedToken: string,
    tokenExpiry: Date,
}
export interface loginUser {
    id: number,
    full_name: string,
    password: string,
    email: string,
    failed_login_attempts: number,
    locked_until: Date | null,
}

export const authUser = {
    id: true,
    email: true,
    full_name: true,
    password: true,
    role: true,
    is_verified: true,
    is_active: true,
    failed_login_attempts: true,
    locked_until: true
} satisfies Prisma.usersSelect;
