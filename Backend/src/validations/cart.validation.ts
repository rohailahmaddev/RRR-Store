import { z } from "zod";

export const addToCartSchema = z.object({
  product_id: z
    .number()
    .int()
    .positive(),

  product_variant_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  quantity: z
    .number()
    .int()
    .positive()
    .max(100),
});

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive()
    .max(100),
});