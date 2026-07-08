import jwt from "jsonwebtoken"

export const getAccessToken = (user) => {
 return jwt.sign({
    id:user.id,
    email:user.email,
    username:user.username,
    fullname:user.fullname,
  },
  process.env.ACCESS_TOKEN_SECRET,
  {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
  );
}

export const getRefreshToken = (user) => {
    return jwt.sign({

    id:user.id,

  },
  process.env.REFRESH_TOKEN_SECRET,
  {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
  );
}