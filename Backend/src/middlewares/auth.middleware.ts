import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {ApiError} from "../shared/error/ApiError.js";
import { asyncHandler } from "../shared/utility/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { AccessTokenPayload } from "../shared/types/index.types.js";
import { userSelect } from "../shared/types/auth.types.js";

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

  const user = await prisma.users.findUnique({
    where:{ id:decoded.id },
    select: userSelect
  })

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  if (!user.is_active) {
    throw new ApiError(403, "Account is inactive");
  }

  req.user = user;

  next();
})