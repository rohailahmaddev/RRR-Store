import {z} from "zod"

export const imageUploadSchema = z.object({
  images: z
    .array(z.any())
    .min(1, "At least one image is required")
    .max(10, "Maximum 10 images allowed"),
});
