import Mailgen from "mailgen";

import { Prisma } from "../../generated/prisma/client.js";

export const userSelect = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  is_verified: true,
  is_active: true,
} satisfies Prisma.usersSelect;

type AuthUser = Prisma.usersGetPayload<{ select: typeof userSelect }>;

export interface User {
  id: number;
  email: string;
  full_name: string;
}

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
      requestId: string;
    }
  }
}

export interface emailOption {
  email:string,
  subject:string,
  mailgenContent:Mailgen.Content
}

export {};