import pool from "../db/index.db.js";
import ApiResponse from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import ApiError from "../utils/ApiError.js";
import {asyncHandler} from "../utils/AsyncHandler.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import crypto from "crypto";
import { getAccessToken, getRefreshToken, getTemporaryToken } from "../utils/JWTokens.js";
import { sendEmail, verificationMailGenerator } from "../utils/mail.js";

    // userAgent: req.headers["user-agent"],
    // ipAddress: req.ip,

const getAccessAndRefreshToken = async(userId, userAgent, userIp) => {
  try {
    const [user] = await pool.query(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    )

    const accessToken = getAccessToken(user[0]);
    const refreshToken = getRefreshToken(user[0])

    await pool.query(`
      INSERT INTO refresh_tokens 
            (user_id, token_hash, user_agent, ip_address) 
         VALUES (?, ?, ?, ?, ?)
      `, [userId, refreshToken, userAgent, ipAddress])


    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(500, `Something went wrong. ${error.message}`)
  }
}

export const registerUser = asyncHandler( async (req, res) => {

  const { full_name, email, password, phone } = req.body;

  const [user] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  )

  if (user.length > 0) {
    return res
      .status(401)
      .json(new ApiResponse(401, "User already exist"))
  }

  const avatarLocalPath = req.file?.avatar_url?.path;



  let avatarImage
  if (avatarLocalPath) {

    try {

      avatarImage = await uploadOnCloudinary(avatarLocalPath)

    } catch (error) {

      return res
        .status(402)
        .json(new ApiError(504, `Failed to upload avatar image. ${error.message}`))

    }

  }
  const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

  const hashedPassword = await bcrypt.hash(password, 10);

  const [result] = await pool.query(`
    INSERT INTO users (full_name, email, password, phone, avatar_url, verify_token, verify_token_expiry)
    VALUES ( ?, ?, ?, ?, ?, ?, ? )
  `, [full_name, email, hashedPassword, phone, avatarImage?.url || "", hashedToken, tokenExpiry ])

  
  const [rows] = await pool.query(
    `SELECT full_name, email, phone
    FROM users
    WHERE id = ?`,
    [result.insertId]
  );
  
  const insertedUser = rows[0];


  await sendEmail({
    email: insertedUser?.email,
    subject: "Please verify your email",
    mailgenContent: verificationMailGenerator(
      insertedUser.full_name,
      `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
    ),
  })

  return res
    .status(200)
    .json(new ApiResponse(200, "User register Successfully",  insertedUser))

})

export const verifyEmail = asyncHandler( async (req, res) => {

  const { token } = req.params; 

  const hashedToken = crypto.createHmac('sha256', process.env.TEMPORARY_TOKEN_SECRET)
                 .update(token)
                 .digest('hex');

  const [user] = await pool.query(
    `SELECT * FROM users WHERE verify_token = ? AND verify_token_expiry > NOW()`,
    [hashedToken]
  ) 

  if(user.length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, "Invalid and verification time is over"))
  }

  await pool.query(
    `UPDATE users SET is_verified = true, verify_token = NULL, verify_token_expiry = NULL WHERE id = ?`,
    [user[0].id]
  )

  return res
    .status(200)
    .json(new ApiResponse(200, "Email verified successfully"))

})

export const loginUser = asyncHandler( async (req, res) => {

})
