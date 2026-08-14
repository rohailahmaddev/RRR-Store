import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {ApiError} from "../shared/error/ApiError.js";
import { asyncHandler } from "../shared/utility/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { AccessTokenPayload, UserRow } from "../shared/types/index.types.js";

export const verifyJWT = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

  const token = req.cookies?.access_token || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
      throw new ApiError(401, "Unauthorized request.");
  }

  let decoded: AccessTokenPayload;
  try {

    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as AccessTokenPayload;

  } catch (error) {
  
    if (error instanceof jwt.TokenExpiredError) {

      throw new ApiError(401, "Access token expired");

    }

    throw new ApiError(401, "Invalid access token");

  }
  const [rows] = await pool.query<UserRow[]>(
    `SELECT id, full_name, email, role, is_active, is_verified FROM users WHERE id = ?`,
    [decoded.id]
  );

  const user = rows[0];

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  if (!user.is_active) {
    throw new ApiError(403, "Account is inactive");
  }

  req.user = user;

  next();
})