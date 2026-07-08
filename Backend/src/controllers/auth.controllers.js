import pool from "../db/index.db";
import ApiResponse from "../utils/ApiResponse";
import asyncHandler from "../utils/AsyncHandler.js"

const getAccessAndRefreshToken = () => {

}

export const registerUser = asyncHandler( async (req, res) => {
  const { full_name, email, password, phone } = req.body;
  
  const [user] = await pool.query(
    `SELECT FROM users WHERE email = ?`, 
    [email]
  )

  if(user[0]){
    return res
    .status(401)
    .json(new ApiResponse(401,"User already exist"))
  }

  const avatarLocalPath = req.file?.avatar?.path;

  
  
})