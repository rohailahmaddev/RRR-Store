import { NextFunction, Request, Response } from "express";

export const validateImages = (
  options: { min?: number; max?: number; maxSizeBytes?: number; allowedMimeTypes?: string[] } = {}
) => {
  const {
    min = 1,
    max = 5,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
    allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"],
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length < min) {
      return res.status(400).json({ success: false, message: `At least ${min} image(s) required` });
    }
    if (files.length > max) {
      return res.status(400).json({ success: false, message: `Maximum ${max} images allowed` });
    }

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(", ")}`,
        });
      }
      if (file.size > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          message: `File "${file.originalname}" exceeds max size of ${maxSizeBytes / (1024 * 1024)}MB`,
        });
      }
    }

    next();
  };
};