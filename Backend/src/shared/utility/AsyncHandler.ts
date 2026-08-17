import { NextFunction, Request, RequestHandler, Response } from "express";

export const asyncHandler = (requestHandler : RequestHandler) : RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
       return Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
    };
};