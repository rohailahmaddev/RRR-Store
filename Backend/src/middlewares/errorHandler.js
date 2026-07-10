import ApiError from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If it's not already an ApiError, normalize it into one
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong";

    // --- MySQL-specific errors ---
    if (error.code === "ER_DUP_ENTRY") {
      statusCode = 409;
      message = "Duplicate entry. This record already exists.";
    } else if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === "ER_NO_REFERENCED_ROW") {
      statusCode = 400;
      message = "Referenced record does not exist.";
    } else if (error.code === "ER_BAD_NULL_ERROR") {
      statusCode = 400;
      message = "Missing required field.";
    } else if (error.code === "ER_DATA_TOO_LONG") {
      statusCode = 400;
      message = "One of the fields exceeds the allowed length.";
    }

    // --- JWT-specific errors (in case any slip through un-caught) ---
    else if (error.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid token";
    } else if (error.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token expired";
    }

    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
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