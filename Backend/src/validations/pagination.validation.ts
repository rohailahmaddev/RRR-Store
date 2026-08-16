import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),
});

export const productFilterSchema =paginationSchema.extend({
    category_id: z.coerce
      .number()
      .int()
      .positive()
      .optional(),

    min_price: z.coerce
      .number()
      .nonnegative()
      .optional(),

    max_price: z.coerce
      .number()
      .nonnegative()
      .optional(),

    rating: z.coerce
      .number()
      .min(0)
      .max(5)
      .optional(),

    search: z
      .string()
      .trim()
      .max(100)
      .optional(),

    sort: z
      .enum([
        "created_at",
        "price",
        "name",
        "rating",
      ])
      .default("created_at"),

    order: z
      .enum(["asc", "desc"])
      .default("desc"),
  })
  .superRefine((data, ctx) => {
    if (
      data.min_price !== undefined &&
      data.max_price !== undefined &&
      data.min_price > data.max_price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["max_price"],
        message:
          "max_price must be greater than min_price",
      });
    }
});

export const idParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive(),
});
