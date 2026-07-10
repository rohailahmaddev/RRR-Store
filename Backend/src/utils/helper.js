import ApiError from "./ApiError.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "./Cloudinary.js";



//hash tokens
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const revokeTokenChain = async (tokenId) => {
  const [rows] = await pool.query(
    `SELECT id, replaced_by FROM refresh_tokens WHERE id = ?`,
    [tokenId]
  );
  if (rows.length === 0) return;

  await pool.query(`UPDATE refresh_tokens SET is_revoked = true WHERE id = ?`, [tokenId]);

  if (rows[0].replaced_by) {
    await revokeTokenChain(rows[0].replaced_by);
  }
}

export const getAccessAndRefreshToken = async (userId, userAgent, userIp, oldTokenId = null) => {
  try {
    const [user] = await pool.query(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    )

    const accessToken = getAccessToken(user[0]);
    const refreshToken = getRefreshToken(user[0])

    const hashedRefreshToken = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [insertResult] = await pool.query(`
      INSERT INTO refresh_tokens 
            (user_id, token_hash, user_agent, ip_address, expires_at) 
         VALUES (?, ?, ?, ?, ?)
      `, [userId, hashedRefreshToken, userAgent, userIp, expiresAt]
    )

    // Rotation: retire the old token, point it at the new one
    if (oldTokenId) {
      await pool.query(
        `UPDATE refresh_tokens SET is_revoked = true, replaced_by = ? WHERE id = ?`,
        [insertResult.insertId, oldTokenId]
      );
    }

    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(500, `Something went wrong. ${error.message}`)
  }
}

export const uploadImagesOnCloudinary = async (filesLocalPath = []) => {

  if(!filesLocalPath || filesLocalPath.length === 0) return []

  console.log(filesLocalPath)
  
  let uploadResult = await Promise.allSettled(
    filesLocalPath.map((filePath) => uploadOnCloudinary(filePath))
  )

  let upload = []
  let failed = []

  uploadResult.forEach((result, index) => {

    if(result.status === "fulfilled" && result.value){
      upload.push(result.value)
    } else {
      failed.push(filesLocalPath[index])
    }
  
  });

  if(failed.length>0){
    await Promise.all(
      failed.map((img) => deleteFromCloudinary(img.public_id))
    )

    throw new ApiError(`Failed to upload ${failed.length} image(s)`);
  }

  return upload

}