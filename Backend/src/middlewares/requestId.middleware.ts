import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const RequestId = async(req:Request, res:Response, next: NextFunction) =>{

    const inComingId = req.header('x-request-id')
    const requestId = typeof inComingId === 'string' && inComingId.trim() !== ''? inComingId: randomUUID()

    req.requestId = requestId;
    res.setHeader('X-Request-Id',requestId)

    next();
}
