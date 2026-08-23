import Mailgen from "mailgen";
import { Prisma } from "../../generated/prisma/client.js";
import { Decimal } from "@prisma/client/runtime/client";

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

export interface cartItem {
 quantity: number;
 product: {
 price: Decimal ;
 };
}

export type cartItemList = cartItem[]

export interface uploadedImages{
    url:string;
    public_id:string;
};

export type uploadImagesList = uploadedImages[];

export interface productVariants{
  stock:number;
  size_name:string;
  color:string;
}

export type productVariantsList = productVariants[];

export {};