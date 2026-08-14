
export interface AccessTokenPayload{
  id: number;
}

//user
export interface UserRow{
 full_name:string;
 email:string;
 phone:number;
 avatar_url:string;
 role:string;
 is_active:boolean;
 is_verified:boolean;
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
      user?: UserRow;
    }
  }
}

export {};