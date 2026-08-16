import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../shared/utility/asyncHandler.js";
import { ApiResponse } from "../shared/utility/ApiResponse.js";

export const isAdmin = asyncHandler(async (req:Request, res:Response, next:NextFunction) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json(new ApiResponse(403, "Access denied. Admins only."));
  }
  next();
});