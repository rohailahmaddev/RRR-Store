import { Prisma } from "../../generated/prisma/client.js";

export function getErrorMessage(error: unknown): string {
  // --- Prisma errors ---
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const meta = error.meta as
          | {
              target?: unknown;
              driverAdapterError?: {
                cause?: {
                  originalMessage?: string;
                  constraint?: { index?: string };
                };
              };
            }
          | undefined;

        // Newer driver-adapter shape (e.g. MySQL via Prisma driver adapters)
        const constraintIndex = meta?.driverAdapterError?.cause?.constraint?.index;
        const originalMessage = meta?.driverAdapterError?.cause?.originalMessage;

        if (constraintIndex) {
          // e.g. "products_sku_key" -> "sku"
          const match = constraintIndex.match(/^[a-zA-Z0-9]+_(.+)_key$/);
          const field = match ? match[1] : constraintIndex;

          // Try to extract the actual duplicate value from originalMessage
          const valueMatch = originalMessage?.match(/Duplicate entry '(.+)' for key/);
          const value = valueMatch?.[1];

          return value
            ? `${field} "${value}" already exists`
            : `Duplicate value for: ${field}`;
        }

        // Fallback: older/standard Prisma shape (Postgres/SQLite, or older connector)
        const target = meta?.target;
        let fieldNames: string;
        if (Array.isArray(target)) {
          fieldNames = target.join(", ");
        } else if (typeof target === "string") {
          fieldNames = target;
        } else {
          fieldNames = "unknown field";
        }

        return `Duplicate value for: ${fieldNames}`;
      }

      case "P2003": {
        const field = error.meta?.field_name;
        return `Invalid reference: ${field ?? "related record"} does not exist`;
      }

      case "P2025":
        return "Record not found";

      case "P2000":
        return "Value too long for field";

      default:
        return `Database error (${error.code})`;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data provided to database query";
  }

  // --- Cloudinary errors ---
  if (isCloudinaryError(error)) {
    return error.error?.message ?? "Image upload failed";
  }

  // --- Nodemailer / Mailtrap (SMTP) errors ---
  if (isSmtpError(error)) {
    switch (error.code) {
      case "EAUTH":
        return "Email authentication failed";
      case "ECONNECTION":
        return "Could not connect to email server";
      case "EENVELOPE":
        return "Invalid sender or recipient email address";
      case "ETIMEDOUT":
        return "Email server connection timed out";
      default:
        return "Failed to send email";
    }
  }

  // --- Axios / fetch-based HTTP errors ---
  if (isAxiosLikeError(error)) {
    return error.response?.data?.message ?? `Request failed (${error.response?.status ?? "unknown"})`;
  }

  // --- Zod validation errors (fallback, if one slips through unformatted) ---
  if (error instanceof Error && error.name === "ZodError") {
    return "Validation failed";
  }

  // --- Generic JS errors ---
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// --- Type guards ---

function isCloudinaryError(
  error: unknown
): error is { error?: { message?: string }; http_code?: number } {
  return typeof error === "object" && error !== null && "http_code" in error;
}

function isSmtpError(
  error: unknown
): error is { code?: string; responseCode?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as any).code === "string" &&
    ["EAUTH", "ECONNECTION", "EENVELOPE", "ETIMEDOUT"].includes((error as any).code)
  );
}

function isAxiosLikeError(
  error: unknown
): error is { response?: { status?: number; data?: { message?: string } } } {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}