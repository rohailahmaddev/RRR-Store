import { NextFunction, Request, Response } from "express";

export const parseJsonFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const field of fields) {
        const value = req.body[field];
        if (typeof value === "string") {
          req.body[field] = JSON.parse(value);
        }
      }

      next();
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in request body.",
      });
    }
  };
};