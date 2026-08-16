import { z } from "zod";

export const productVariantSchema = z.object({
  size_name: z
    .string()
    .trim()
    .min(1)
    .max(50),

  color: z
    .string()
    .trim()
    .min(1)
    .max(50),

  stock: z
    .number()
    .int()
    .nonnegative(),
});

export const productVariantsSchema =
  z
    .array(productVariantSchema)
    .superRefine((variants, ctx) => {
      const seen = new Set<string>();

      variants.forEach((variant, index) => {
        const key =
          `${variant.size_name.toLowerCase()}-${variant.color.toLowerCase()}`;

        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: [index],
            message:
              "Duplicate size and color combination",
          });
        }

        seen.add(key);
      });
});

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1)
    .max(50),

  name: z
    .string()
    .trim()
    .min(2)
    .max(255),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  price: z
    .number()
    .finite()
    .nonnegative(),

  category_id: z
    .number()
    .int()
    .positive(),

  variants: productVariantsSchema.optional(),
});