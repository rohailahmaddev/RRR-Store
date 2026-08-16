import { z } from "zod";

export const createOrderSchema = z.object({
  address_id: z
    .number()
    .int()
    .positive(),

  payment_method: z.enum([
    "cod",
    "stripe",
    "paypal",
    "jazzcash",
    "easypaisa",
  ]),
});
