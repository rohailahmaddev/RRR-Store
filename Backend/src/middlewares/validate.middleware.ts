import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export const validate = <T extends ZodType>( schema: T ) => {

  return ( req: Request, res: Response, next: NextFunction ) => {

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    req.body = result.data;

    next();
  };
};