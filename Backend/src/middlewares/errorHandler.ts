import { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/error/ApiError.js";

interface MySQLError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const customErr = err as MySQLError;

    let statusCode = 500;
    let message = err.message || "Something went wrong";
    let errors: unknown[] = [];

    // --- MySQL-specific errors ---
    if (customErr.code === "ER_DUP_ENTRY") {
      statusCode = 409;
      message = "Duplicate entry. This record already exists.";
    } else if (
      customErr.code === "ER_NO_REFERENCED_ROW_2" ||
      customErr.code === "ER_NO_REFERENCED_ROW"
    ) {
      statusCode = 400;
      message = "Referenced record does not exist.";
    } else if (customErr.code === "ER_BAD_NULL_ERROR") {
      statusCode = 400;
      message = "Missing required field.";
    } else if (customErr.code === "ER_DATA_TOO_LONG") {
      statusCode = 400;
      message = "One of the fields exceeds the allowed length.";
    }

    // --- JWT-specific errors (in case any slip through un-caught) ---
    else if (customErr.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    } else if (customErr.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    // Only leak stack trace in development
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};