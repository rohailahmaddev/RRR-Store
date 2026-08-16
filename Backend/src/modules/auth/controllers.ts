import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { isUserExistService, userRegisterService } from "./services.js";
import { ApiError } from "../../shared/utility/ApiError.js";

//   const { full_name, email, password, phone } = req.body;

//   const [user] = await pool.query(
//     `SELECT * FROM users WHERE email = ?`,
//     [email]
//   )

//   if (user.length > 0 && user[0].is_verified) {
//     throw new ApiError(409, "User already exist. Please login.")
//   }

//   if (user.length > 0 && !user[0].is_verified) {

//     const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

//     await pool.query(
//       `UPDATE users SET verify_token = ?, verify_token_expiry = ? WHERE id = ?`,
//       [hashedToken, tokenExpiry, user[0].id]
//     )

//     try {
//       await sendEmail({
//         email: user[0]?.email,
//         subject: "Please verify your email",
//         mailgenContent: verificationMailGenerator(
//           user[0]?.full_name,
//           `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
//         ),
//       })
//     } catch (error) {
//       throw new ApiError(500, `Failed to send verification email. ${error.message}`)
//     }

//     throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
//   }

//   const avatarLocalPath = req.file?.avatar_url?.path;

//   let avatarImage
//   if (avatarLocalPath) {

//     try {

//       avatarImage = await uploadOnCloudinary(avatarLocalPath)

//     } catch (error) {

//       throw new ApiError(504, `Failed to upload avatar image. ${error.message}`)

//     }

//   }
//   const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

//   const hashedPassword = await bcrypt.hash(password, 10);

//   let result;
//   try {
//     [result] = await pool.query(`
//       INSERT INTO users (full_name, email, password, phone, avatar_url, verify_token, verify_token_expiry)
//       VALUES ( ?, ?, ?, ?, ?, ?, ? )
//     `, [full_name, email, hashedPassword, phone, avatarImage?.url || "", hashedToken, tokenExpiry])
//   } catch (error) {

//     // Clean up orphaned Cloudinary upload if the DB insert failed
//     if (avatarImage?.public_id) {
//       await deleteFromCloudinary(avatarImage.public_id).catch(() => { });
//     }

//     if (error.code === 'ER_DUP_ENTRY') {
//       throw new ApiError(409, "User already exist. Please login.")
//     }

//     throw error;
//   }

//   const insertedUser = {
//     id: result.insertId,
//     full_name: full_name,
//     email: email,
//     phone: phone,
//   };


//   try {
//     await sendEmail({
//       email: insertedUser?.email,
//       subject: "Please verify your email",
//       mailgenContent: verificationMailGenerator(
//         insertedUser.full_name,
//         `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
//       ),
//     })
//   } catch (error) {

//     throw new ApiError(500, `Failed to send verification email. ${error.message}`)
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, "Verification Email sent to your registered email. Please verify your email.", insertedUser))

// })

export const registerUserController = asyncHandler( async (req:Request, res: Response) => {
    const { full_name, email, password, phone } = req.body;
        
    const avatarLocalPath = (req as any).file?.avatar?.path;
    
    
}) 