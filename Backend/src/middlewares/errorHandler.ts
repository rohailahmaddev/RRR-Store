import { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/utility/ApiError.js";
import { env } from "../config/env.js";

interface MySQLError extends Error {
  code?: string;
}

export const errorHandler = ( err: Error, req: Request, res: Response, next: NextFunction ) => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const customErr = err as MySQLError;

    let statusCode = 500;
    let code = "SERVER_ERROR";
    let message = err.message || "Something went wrong";
    let errors: unknown[] = [];

    // --- MySQL-specific errors ---
    if (customErr.code === "ER_DUP_ENTRY") {
      statusCode = 409;
      code="ER_DUP_ENTRY"
      message = "Duplicate entry. This record already exists.";
    } else if (
      customErr.code === "ER_NO_REFERENCED_ROW_2" ||
      customErr.code === "ER_NO_REFERENCED_ROW"
    ) {
      statusCode = 400;
      code = "ER_NO_REFERENCED_ROW"
      message = "Referenced record does not exist.";
    } else if (customErr.code === "ER_BAD_NULL_ERROR") {
      statusCode = 400;
      code = "ER_BAD_NULL_ERROR"
      message = "Missing required field.";
    } else if (customErr.code === "ER_DATA_TOO_LONG") {
      statusCode = 400;
      code = "ER_DATA_TOO_LONG"
      message = "One of the fields exceeds the allowed length.";
    }

    // --- JWT-specific errors (in case any slip through un-caught) ---
    else if (customErr.name === "JsonWebTokenError") {
      statusCode = 401;
      code="JSON_WEBTOKEN_ERROR"
      message = "Invalid token";
    } else if (customErr.name === "TokenExpiredError") {
      statusCode = 401;
      code = "TOKEN_EXPIRED_ERROR"
      message = "Token expired";
    }

    error = new ApiError(statusCode, message, code, errors, err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    code:error.code,
    errors: error.errors,
    // Only leak stack trace in development
    ...(env.NODE_ENV === "development" && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};