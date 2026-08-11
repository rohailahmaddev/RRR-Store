import pool from "../config/index.db.js";
import ApiResponse from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import crypto from "crypto";
import { getAccessToken, getRefreshToken, getTemporaryToken } from "../utils/JWTokens.js";
import { sendEmail, verificationMailGenerator } from "../utils/mail.js";
import { getAccessAndRefreshToken, hashToken, revokeTokenChain } from "../utils/helper.js";

export const registerUser = asyncHandler(async (req, res) => {

  const { full_name, email, password, phone } = req.body;

  const [user] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  )

  if (user.length > 0 && user[0].is_verified) {
    throw new ApiError(409, "User already exist. Please login.")
  }

  if (user.length > 0 && !user[0].is_verified) {

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

    await pool.query(
      `UPDATE users SET verify_token = ?, verify_token_expiry = ? WHERE id = ?`,
      [hashedToken, tokenExpiry, user[0].id]
    )

    try {
      await sendEmail({
        email: user[0]?.email,
        subject: "Please verify your email",
        mailgenContent: verificationMailGenerator(
          user[0]?.full_name,
          `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
        ),
      })
    } catch (error) {
      throw new ApiError(500, `Failed to send verification email. ${error.message}`)
    }

    throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
  }

  const avatarLocalPath = req.file?.avatar_url?.path;

  let avatarImage
  if (avatarLocalPath) {

    try {

      avatarImage = await uploadOnCloudinary(avatarLocalPath)

    } catch (error) {

      throw new ApiError(504, `Failed to upload avatar image. ${error.message}`)

    }

  }
  const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

  const hashedPassword = await bcrypt.hash(password, 10);

  let result;
  try {
    [result] = await pool.query(`
      INSERT INTO users (full_name, email, password, phone, avatar_url, verify_token, verify_token_expiry)
      VALUES ( ?, ?, ?, ?, ?, ?, ? )
    `, [full_name, email, hashedPassword, phone, avatarImage?.url || "", hashedToken, tokenExpiry])
  } catch (error) {

    // Clean up orphaned Cloudinary upload if the DB insert failed
    if (avatarImage?.public_id) {
      await deleteFromCloudinary(avatarImage.public_id).catch(() => { });
    }

    if (error.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, "User already exist. Please login.")
    }

    throw error;
  }

  const insertedUser = {
    id: result.insertId,
    full_name: full_name,
    email: email,
    phone: phone,
  };


  try {
    await sendEmail({
      email: insertedUser?.email,
      subject: "Please verify your email",
      mailgenContent: verificationMailGenerator(
        insertedUser.full_name,
        `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
      ),
    })
  } catch (error) {

    throw new ApiError(500, `Failed to send verification email. ${error.message}`)
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Verification Email sent to your registered email. Please verify your email.", insertedUser))

})

export const verifyEmail = asyncHandler(async (req, res) => {

  const { token } = req.params;

  const hashedToken = crypto.createHmac('sha256', process.env.TEMPORARY_TOKEN_SECRET)
    .update(token)
    .digest('hex');

  const [user] = await pool.query(
    `SELECT * FROM users WHERE verify_token = ? AND verify_token_expiry > NOW()`,
    [hashedToken]
  )

  if (user.length === 0) {
    throw new ApiError(400, "Invalid user or verification time is over. Please request a new verification email.")
  }

  await pool.query(
    `UPDATE users SET is_verified = true, verify_token = NULL, verify_token_expiry = NULL WHERE id = ?`,
    [user[0].id]
  )

  return res
    .status(200)
    .json(new ApiResponse(200, "User verified successfully. Please login to continue."))

})

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const [user] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  )

  if (user.length === 0) {
    throw new ApiError(404, "User not found. Please register first.")
  }

  if (user[0].is_verified) {
    throw new ApiError(409, "User already verified. Please login.")
  }

  const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

  await pool.query(
    `UPDATE users SET verify_token = ?, verify_token_expiry = ? WHERE id = ?`,
    [hashedToken, tokenExpiry, user[0].id]
  )

  try {
    await sendEmail({
      email: user[0]?.email,
      subject: "Please verify your email",
      mailgenContent: verificationMailGenerator(
        user[0]?.full_name,
        `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
      ),
    })
  } catch (error) {
    throw new ApiError(500, `Failed to send verification email. ${error.message}`)
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Verification email resent successfully. Please check your email for the verification link."))
})

export const loginUser = asyncHandler(async (req, res) => {

  const { email, password } = req.body;

  if(!email || !password ){
    throw new ApiError(403, "Login and password is required")
  }

  const [user] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  )

  if (user.length === 0 || !user[0].is_active) {
    throw new ApiError(401, "Invalid email or account is inactive. Please contact support.")
  }

  //validate locked account
  if(user[0].locked_until && new Date(user[0].locked_until) > new Date()){
    const minutesLeft = Math.ceil((new Date(user[0].locked_until) - new Date()) / 60000);
    throw new ApiError(429,`Account temporarily locked. Try again in ${minutesLeft} minute(s).`)
  }
  
  const isPasswordMatch = await bcrypt.compare(password, user[0].password);
  
  const MAX_ATTEMPT = 5;
  const LOCKED_MINUTES = 59;
  if (!isPasswordMatch) {

    let failedAttempts = user[0].failed_login_attempts + 1;
    if(failedAttempts >= MAX_ATTEMPT){
      try {
        await pool.query(`UPDATE users SET failed_login_attempts = ?, locked_until = DATE_ADD( NOW(), INTERVAL ? MINUTE) WHERE id = ?`,
        [failedAttempts, LOCKED_MINUTES, user[0].id]
        )
      } catch (error) {
        throw new ApiError(500, "Something went wrong while locking the account");
      }
      throw new ApiError(401, `Invalid password accout is locked please try again after 59 minutes.`);
    } else {
      try {

        await pool.query(` UPDATE users SET failed_login_attempts = ? WHERE id = ?`,
        [failedAttempts, user[0].id])

      } catch (error) {
        throw new ApiError(500, "Something went wrong");
      }

      throw new ApiError(401, `Invalid passowrd remaining attempts ${MAX_ATTEMPT-failedAttempts}`)
    }

  } else {

    try {
      await pool.query(`UPDATE users SET failed_login_attempts = 0 , locked_until = null WHERE id = ?`,
        [user[0].id]
      )
    } catch (error) {
       throw new ApiError(500, "Something went wrong");
    }

  }

  if (!user[0].is_verified) {
    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    await pool.query(
      `UPDATE users SET verify_token = ?, verify_token_expiry = ? WHERE id = ?`,
      [hashedToken, tokenExpiry, user[0].id]
    )
    try {
      await sendEmail({
        email: user[0]?.email,
        subject: "Please verify your email",
        mailgenContent: verificationMailGenerator(
          user[0]?.full_name,
          `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
        ),
      })
    } catch (error) {
      throw new ApiError(500, `Failed to send verification email. ${error.message}`)
    }

    throw new ApiError(403, "User not verified. Please check your email for verification link.")
  }



  // Generate JWT token
  const { accessToken, refreshToken } = await getAccessAndRefreshToken(user[0].id, req.headers["user-agent"], req.ip);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const loggedInUser = {
    full_name: user[0].full_name,
    email: user[0].email,
    phone: user[0].phone,
    avatar_url: user[0].avatar_url,
  };

  return res
    .status(200)
    .cookie("access_token", accessToken, cookieOptions)
    .cookie("refresh_token", refreshToken, cookieOptions)
    .json(new ApiResponse(200, "Login successfully", {
      user: loggedInUser,
      access_token: accessToken,
    }))
})

export const logoutUser = asyncHandler(async (req, res) => {

  const { access_token, refresh_token } = req.cookies;

  if (!access_token || !refresh_token) {
    throw new ApiError(400, "No tokens found in cookies")
  }

  const hashedRefreshToken = hashToken(refresh_token);

  // Revoke the refresh token in the database
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = ?`,
    [hashedRefreshToken]
  )

  // Clear the cookies
  return res
    .clearCookie("access_token")
    .clearCookie("refresh_token")
    .json(new ApiResponse(200, "Logout successfully"))

})

export const refreshToken = asyncHandler(async (req, res) => {

  const { refresh_token } = req.cookies;

  if (!refresh_token) {
    throw new ApiError(400, "No refresh token found in cookies")
  }

  const hashedRefreshToken = hashToken(refresh_token);

  const [tokenRecord] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND is_revoked = false`,
    [hashedRefreshToken]
  )

  if (tokenRecord.length === 0) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    throw new ApiError(401, "Invalid refresh token");
  }

  const [user] = await pool(`SELECT * FROM users WHERE id = ?`,[tokenRecord[0].user_id])
  if(user.length===0){
    throw new ApiError(401, "Invalid user.")
  }
  //validate locked account
  if(user[0].locked_until && new Date(user[0].locked_until) > new Date()){
    const minutesLeft = Math.ceil((new Date(user[0].locked_until) - new Date()) / 60000);
    throw new ApiError(429,`Account temporarily locked. Try again in ${minutesLeft} minute(s).`)
  }
  
  // Reused after rotation -> possible theft, kill the whole chain
  if (tokenRecord.is_revoked) {
    await revokeTokenChain(tokenRecord.id);
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    throw new ApiError(401, "Token reuse detected, session revoked");
  }

  // Expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    throw new ApiError(401, "Refresh token expired");
  }

  const userId = tokenRecord[0].user_id;

  const { accessToken, refreshToken } = await getAccessAndRefreshToken(userId, req.headers["user-agent"], req.ip, tokenRecord[0].id);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return res
    .status(200)
    .cookie("access_token", accessToken, cookieOptions)
    .cookie("refresh_token", refreshToken, cookieOptions)
    .json(new ApiResponse(200, "Token refreshed successfully", {
      access_token: accessToken
    }))

})

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const [user] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  )

  if (user.length === 0) {
    throw new ApiError(404, "User not found")
  }

  const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

  await pool.query(
    `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`,
    [hashedToken, tokenExpiry, user[0].id]
  )

  try {
    await sendEmail({
      email: user[0]?.email,
      subject: "Password Reset Request",
      mailgenContent: passwordResetMailGenerator(
        user[0]?.full_name,
        `${req.protocol}://${req.get("host")}/api/user/reset-password/${unHashedToken}`
      ),
    })
  } catch (error) {
    throw new ApiError(500, `Failed to send password reset email. ${error.message}`)
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Please check your email for the reset link."))

})

export const resetPassword = asyncHandler(async (req, res) => {

  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Please click on the reset link sent to your email to reset your password.")
  }

  if (!newPassword) {
    throw new ApiError(400, "New password is required")
  }

  const hashedToken = crypto.createHmac('sha256', process.env.TEMPORARY_TOKEN_SECRET)
    .update(token)
    .digest('hex');


  const [user] = await pool.query(
    `SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()`,
    [hashedToken]
  )

  if (user.length === 0) {
    throw new ApiError(400, "Invalid user or reset time is over. Please request a new password reset link.")
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?`,
    [hashedPassword, user[0].id]
  )

  return res
    .status(200)
    .json(new ApiResponse(200, "Password reset successfully. Please login with your new password."))

})

export const deactivateUser = asyncHandler(async (req, res) => {

  const { id:userId } = req.params;

  if (Number(userId) === adminId) {
    throw new ApiError(400, "Admin cannot deactivate their own account.")
  }

  const [user] = await pool.query(
    `SELECT * FROM users WHERE id = ?`,
    [userId]
  )

  if (user.length === 0) {
    throw new ApiError(404, "User not found")
  }

  //admin cannot deactivate their own account
  if (user[0].role === "admin") {
    throw new ApiError(403, "Admin accounts cannot be deactivated.")
  }

  if (!user[0].is_active) {
    throw new ApiError(400, "User account is already deactivated.")
  }
  const connection = pool.getConnection()

  try {

    await connection.beginTransaction()
    // Deactivate the user account
    await connection.query(
      `UPDATE users SET is_active = false WHERE id = ?`,
      [userId]
    )
    
    // Revoke all active refresh tokens so existing sessions die immediately
    await connection.query(
      `UPDATE refresh_tokens SET is_revoked = true WHERE user_id = ? AND is_revoked = false`,
      [userId]
    );

    await connection.commit()

    //create audit logs
    await logAudit({
      userId: req.user.id,
      action: "DEACTIVATE_USER",
      entityType: "users",
      entityId: Number(userId),
      details: { is_active: {from: user[0].is_active, to: false} },
      ipAddress: req.ip,
      connection, // pass the transaction connection here
    });

    return res
    .status(200)
    .json(new ApiResponse(200, "User account deactivated successfully."))

  } catch (error) {
    await connection.rollback();
    throw new ApiError(500, `Failed to deactivated the user`)    
  } finally {
    connection.release()
  }

})

export const activateUser = asyncHandler(async (req, res) => {
  const { id:userId } = req.params;

  const [rows] = await pool.query(
    `SELECT id, is_active FROM users WHERE id = ?`,
    [userId]
  );

  const targetUser = rows[0];

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  //admin cannot activate their own account
  if (targetUser.role === "admin") {
    throw new ApiError(403, "Admin accounts cannot be activated.")
  }

  if (targetUser.is_active) {
    throw new ApiError(400, "User is already active")
  }

  const [updatedRows] = await pool.query(
    `UPDATE users SET is_active = true WHERE id = ?`,
    [id]
  );

 
  if(updatedRows.affectedRows === 0){
    throw new ApiError(500, "Failed to activate the user.")
  }

  //create audit logs
  await logAudit({
    userId: req.user.id,
    action: "ACTIVATE_USER",
    entityType: "users",
    entityId: Number(userId),
    details: { is_active: {from: targetUser.is_active, to: true} },
    ipAddress: req.ip,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "User reactivated successfully"));
});