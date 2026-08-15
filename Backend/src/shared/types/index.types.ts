import { AuthUser } from "./auth.types.js";

export interface AccessTokenPayload{
  id: number;
}


//global error handler
export interface GlobalError extends Error{
 code:string;
 statusCode:number;
 error:unknown[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};