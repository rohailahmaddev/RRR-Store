import { Request } from "express";

export interface registerUserInput{
    full_name:string,
    email:string,
    password:string,
    phone:string | null,
    req:Request,
    avatarLocalPath:string | null
}

export interface registerCreateUser{
    full_name:string,
    email:string,
    password:string,
    phone:string | null,
    imageUrl:string | null
    hashedToken:string,
    tokenExpiry:Date,
}