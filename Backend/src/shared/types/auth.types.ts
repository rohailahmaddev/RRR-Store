import { Prisma } from "../../generated/prisma/client.js";

export const userSelect = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  is_verified: true,
  is_active: true,
} satisfies Prisma.usersSelect;

export type AuthUser = Prisma.usersGetPayload<{ select: typeof userSelect }>;