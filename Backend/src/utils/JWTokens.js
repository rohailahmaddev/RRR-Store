import jwt from "jsonwebtoken"
import crypto from "crypto";

export const getAccessToken = (user) => {
  return jwt.sign({
    id:user.id,
    email:user.email,
    username:user.username,
    fullname:user.fullname,
  },

  process.env.ACCESS_TOKEN_SECRET,

  { expiresIn:process.env.ACCESS_TOKEN_EXPIRY }

  );
}

export const getRefreshToken = (user) => {

  return jwt.sign({

    id:user.id,

  },

  process.env.REFRESH_TOKEN_SECRET,

  { expiresIn:process.env.REFRESH_TOKEN_EXPIRY }

  );
}

export const getTemporaryToken = () => {

  const unHashedToken = crypto.randomBytes(20).toString("hex")

  const hashedToken = crypto.createHmac('sha256', process.env.TEMPORARY_TOKEN_SECRET)
               .update(unHashedToken)
               .digest('hex');
  
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

  return { unHashedToken, hashedToken, tokenExpiry }

}

