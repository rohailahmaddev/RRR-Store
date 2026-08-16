import jwt from "jsonwebtoken"
import crypto from "crypto";
import {env} from "../../config/env.js"
import type { StringValue } from "ms";
import { User } from "../types/auth.types.js";

export const getAccessToken = (user:User):string => {
  return jwt.sign({
    id:user.id,
    email:user.email,
    fullname:user.full_name,
  },
  env.ACCESS_TOKEN_SECRET,
  { expiresIn:env.ACCESS_TOKEN_EXPIRY as StringValue });
}

export const getRefreshToken = (user:User):string => {

  return jwt.sign({
    id:user.id,
  },
  env.REFRESH_TOKEN_SECRET,
  { expiresIn:env.REFRESH_TOKEN_EXPIRY as StringValue}
  );
}

export const getTemporaryToken = ():object => {

  const unHashedToken = crypto.randomBytes(20).toString("hex")

  const hashedToken = crypto.createHmac('sha256', env.TEMPORARY_TOKEN_SECRET)
               .update(unHashedToken)
               .digest('hex');
  
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

  return { unHashedToken, hashedToken, tokenExpiry }

}

