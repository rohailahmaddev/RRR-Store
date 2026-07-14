import pool from "../db/index.db.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async (req, res, next) => {

  const token = req.cookies?.access_token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request.");
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
    
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token expired");
      }
      throw new ApiError(401, "Invalid access token");
    }

    const [rows] = await pool.query(
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

  // Attach user to request for downstream middleware/controllers (e.g. isAdmin)
  req.user = user;

  next();
})