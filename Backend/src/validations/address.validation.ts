import {z} from "zod"


export const createAddressSchema = z.object({
  label: z
    .string()
    .trim()
    .max(50)
    .optional(),

  full_name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  street: z
    .string()
    .trim()
    .min(3)
    .max(255),

  city: z
    .string()
    .trim()
    .min(2)
    .max(100),

  state: z
    .string()
    .trim()
    .max(100)
    .optional(),

  country: z
    .string()
    .trim()
    .min(2)
    .max(100),

  postal_code: z
    .string()
    .trim()
    .max(20)
    .optional(),

  is_default: z
    .boolean()
    .optional(),
});

export const updateAddressSchema = createAddressSchema.partial();