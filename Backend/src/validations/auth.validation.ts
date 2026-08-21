import { z } from "zod";

//register
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 128 characters"),

  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(30, "Full name must not exceed 100 characters"),

  phone: z
    .string()
    .trim()
    .min(7, "Invalid phone number")
    .max(20, "Phone number must not exceed 20 characters")
    .optional(),
});

//login
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

//forgotPassword
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
});

//reset password
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Reset token is required"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 128 characters"),
});

// changePassword
export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1, "Current password is required"),

    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(10),

    confirm_password: z
      .string()
      .min(1, "Confirm password is required"),
  })
  .refine(
    (data) => data.new_password === data.confirm_password,
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  );

  