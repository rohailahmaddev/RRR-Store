import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { verifyJWT } from "../../../middlewares/auth.middleware.js";
import { prisma } from "../../../config/database.js"; // adjust path
import { ApiError } from "../../../shared/utility/ApiError.js";
import { errorHandler } from "../../../middlewares/errorHandler.js";
import {env} from "../../../config/env.js"
import { isAdmin } from "../../../middlewares/isAdmin.middleware.js";
import { ApiResponse } from "../../../shared/utility/ApiResponse.js";
import upload from "../../../middlewares/multer.middleware.js";
import { RequestId } from "../../../middlewares/requestId.middleware.js";
import { validateImages } from "../../../middlewares/image.middleware.js";
import { AnyAaaaRecord } from "dns";

// Mock jwt library
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
    TokenExpiredError: class TokenExpiredError extends Error {},
  },
}));

// Mock prisma
vi.mock("../../../config/database.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
  },
}));

//verify jwt tokens
describe("verifyJWT middleware", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { cookies: {}, header: vi.fn() };
    res = {};
    next = vi.fn();
  });

  it("throws 401 when no token is provided (no cookie, no header)", async () => {
    req.cookies = {};
    req.header.mockReturnValue(undefined);

    await verifyJWT(req, res, next as any);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "Unauthorized request." })
    );
  });

  it("reads token from cookies when present", async () => {
    req.cookies.access_token = "valid-token";
    (jwt.verify as any).mockReturnValue({ id: 1 });
    (prisma.users.findUnique as any).mockResolvedValue({
      id: 1,
      is_active: true,
    });

    await verifyJWT(req, res, next as any);

    expect(jwt.verify).toHaveBeenCalledWith("valid-token", expect.any(String));
    expect(next).toHaveBeenCalledWith(); // called with no error = success
  });

  it("reads token from Authorization header when cookie is absent", async () => {
    req.cookies = {};
    req.header.mockReturnValue("Bearer header-token");
    (jwt.verify as any).mockReturnValue({ id: 2 });
    (prisma.users.findUnique as any).mockResolvedValue({
      id: 2,
      is_active: true,
    });

    await verifyJWT(req, res, next as any);

    expect(jwt.verify).toHaveBeenCalledWith("header-token", expect.any(String));
  });

  it("throws 401 'Access token expired' when jwt throws TokenExpiredError", async () => {
    req.cookies.access_token = "expired-token";
    (jwt.verify as any).mockImplementation(() => {
      throw new jwt.TokenExpiredError("jwt expired", new Date());
    });

    await verifyJWT(req, res, next as any);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "Access token expired" })
    );
  });

  it("throws 401 'Invalid access token' for other jwt errors", async () => {
    req.cookies.access_token = "malformed-token";
    (jwt.verify as any).mockImplementation(() => {
      throw new Error("jwt malformed");
    });

    await verifyJWT(req, res, next as any);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "Invalid access token" })
    );
  });

  it("throws 401 when decoded user no longer exists in DB", async () => {
    req.cookies.access_token = "valid-token";
    (jwt.verify as any).mockReturnValue({ id: 999 });
    (prisma.users.findUnique as any).mockResolvedValue(null);

    await verifyJWT(req, res, next as any);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: "User no longer exists" })
    );
  });

  it("throws 403 when user account is inactive", async () => {
    req.cookies.access_token = "valid-token";
    (jwt.verify as any).mockReturnValue({ id: 1 });
    (prisma.users.findUnique as any).mockResolvedValue({
      id: 1,
      is_active: false,
    });

    await verifyJWT(req, res, next as any);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: "Account is inactive" })
    );
  });

  it("attaches user to req and calls next() on success", async () => {
    const mockUser = { id: 1, email: "it@example.com", is_active: true };
    req.cookies.access_token = "valid-token";
    (jwt.verify as any).mockReturnValue({ id: 1 });
    (prisma.users.findUnique as any).mockResolvedValue(mockUser);

    await verifyJWT(req, res, next as any);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error passed
  });

  it("calls prisma.users.findUnique with correct id and select", async () => {
    req.cookies.access_token = "valid-token";
    (jwt.verify as any).mockReturnValue({ id: 42 });
    (prisma.users.findUnique as any).mockResolvedValue({ id: 42, is_active: true });

    await verifyJWT(req, res, next as any);

    expect(prisma.users.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 42 } })
    );
  });
});

// globle error handler middleware
describe("errorHandler middleware", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;
  const originalEnv = env.NODE_ENV;

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  afterEach(() => {
    env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("passes through an existing ApiError unchanged", () => {
    const error = new ApiError(404, "Resource not found", "NOT_FOUND");

    errorHandler(error, req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Resource not found",
      })
    );
  });

  it("defaults unknown errors to 500 / SERVER_ERROR", () => {
    const error = new Error("Unexpected crash");

    errorHandler(error, req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: "Unexpected crash",
        code: "SERVER_ERROR",
      })
    );
  });

  it("falls back to 'Something went wrong' when error has no message", () => {
    const error = new Error();
    error.message = "";

    errorHandler(error, req, res, next as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Something went wrong" })
    );
  });

  describe("MySQL error mapping", () => {
    it("ER_DUP_ENTRY -> 409", () => {
      const error = Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Duplicate entry. This record already exists.",
          code: "ER_DUP_ENTRY",
        })
      );
    });

    it("ER_NO_REFERENCED_ROW_2 -> 400", () => {
      const error = Object.assign(new Error("fk"), { code: "ER_NO_REFERENCED_ROW_2" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Referenced record does not exist.",
          code: "ER_NO_REFERENCED_ROW",
        })
      );
    });

    it("ER_NO_REFERENCED_ROW -> 400", () => {
      const error = Object.assign(new Error("fk"), { code: "ER_NO_REFERENCED_ROW" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "ER_NO_REFERENCED_ROW" })
      );
    });

    it("ER_BAD_NULL_ERROR -> 400", () => {
      const error = Object.assign(new Error("null"), { code: "ER_BAD_NULL_ERROR" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Missing required field.",
          code: "ER_BAD_NULL_ERROR",
        })
      );
    });

    it("ER_DATA_TOO_LONG -> 400", () => {
      const error = Object.assign(new Error("toolong"), { code: "ER_DATA_TOO_LONG" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "One of the fields exceeds the allowed length.",
          code: "ER_DATA_TOO_LONG",
        })
      );
    });

    it("unrecognized MySQL code falls back to 500 SERVER_ERROR", () => {
      const error = Object.assign(new Error("weird"), { code: "ER_SOMETHING_ELSE" });

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "SERVER_ERROR" })
      );
    });
  });

  describe("JWT error mapping", () => {
    it("JsonWebTokenError -> 401", () => {
      const error = new Error("bad token");
      error.name = "JsonWebTokenError";

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid token",
          code: "JSON_WEBTOKEN_ERROR",
        })
      );
    });

    it("TokenExpiredError -> 401", () => {
      const error = new Error("expired");
      error.name = "TokenExpiredError";

      errorHandler(error, req, res, next as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Token expired",
          code: "TOKEN_EXPIRED_ERROR",
        })
      );
    });
  });

  describe("stack trace exposure", () => {
    it("includes stack when NODE_ENV=development", () => {
      env.NODE_ENV = "development";
      const error = new Error("boom");

      errorHandler(error, req, res, next as any);

      const responseArg = res.json.mock.calls[0][0];
      expect(responseArg).toHaveProperty("stack");
    });

    it("omits stack when NODE_ENV=production", () => {
      process.env.NODE_ENV = "production";
      const error = new Error("boom");

      errorHandler(error, req, res, next as any);

      const responseArg = res.json.mock.calls[0][0];
      expect(responseArg).not.toHaveProperty("stack");
    });
  });

  it("response always includes success: false", () => {
    const error = new Error("anything");

    errorHandler(error, req, res, next as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("errors array defaults to empty array for generic errors", () => {
    const error = new Error("anything");

    errorHandler(error, req, res, next as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [] })
    );
  });

  it("preserves errors array from an ApiError", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "Invalid input", [
      { field: "email", message: "required" },
    ]);

    errorHandler(error, req, res, next as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [{ field: "email", message: "required" }],
      })
    );
  });
});

//verify admin
describe("isAdmin middleware", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { user: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("calls next() when user role is admin", async () => {
    req.user = { role: "admin" };

    await isAdmin(req, res, next as any);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error passed
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("responds with 403 when user role is not admin", async () => {
    req.user = { role: "customer" };

    await isAdmin(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "Access denied. Admins only.",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("responds with 403 when req.user is undefined", async () => {
    req.user = undefined;

    await isAdmin(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("responds with 403 when req.user has no role property", async () => {
    req.user = { id: 1, email: "it@example.com" };

    await isAdmin(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("is case-sensitive on role check ('Admin' is rejected)", async () => {
    req.user = { role: "Admin" };

    await isAdmin(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("response body is a valid ApiResponse instance shape", async () => {
    req.user = { role: "customer" };

    await isAdmin(req, res, next as any);

    const responseArg = res.json.mock.calls[0][0];
    expect(responseArg).toBeInstanceOf(ApiResponse);
    expect(responseArg.success).toBe(false); // assuming ApiResponse derives success from statusCode < 300
  });
});

//multer

describe("multer storage config", () => {
  const storage = (upload as any).storage;

  const mockFile = {
    fieldname: "avatar",
    originalname: "photo.png",
    encoding: "7bit",
    mimetype: "image/png",
  } as Express.Multer.File;

  const req = {} as any;

  it("destination callback resolves to './public/temp'", () => {
    const cb = vi.fn();

    storage.getDestination(req, mockFile, cb);

    expect(cb).toHaveBeenCalledWith(null, "./public/temp");
  });

  it("filename callback generates a name prefixed with the fieldname", () => {
    const cb = vi.fn();

    storage.getFilename(req, mockFile, cb);

    expect(cb).toHaveBeenCalledOnce();
    const [error, filename] = cb.mock.calls[0]!;
    expect(error).toBeNull();
    expect(filename).toMatch(/^avatar-\d+-\d+$/);
  });

  it("filename callback produces unique names on repeated calls", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    storage.getFilename(req, mockFile, cb1);
    storage.getFilename(req, mockFile, cb2);

    const filename1 = cb1.mock.calls[0]?.[1];
    const filename2 = cb2.mock.calls[0]?.[1];

    expect(filename1).not.toBe(filename2);
  });

  it("filename callback uses the correct fieldname from different files", () => {
    const cb = vi.fn();
    const differentFile = { ...mockFile, fieldname: "cover_image" } as Express.Multer.File;

    storage.getFilename(req, differentFile, cb);

    const filename = cb.mock.calls[0]?.[1];
    expect(filename.startsWith("cover_image-")).toBe(true);
  });

  it("filename callback never passes an error", () => {
    const cb = vi.fn();

    storage.getFilename(req, mockFile, cb);

    expect(cb.mock.calls[0]?.[0]).toBeNull();
  });

  it("upload is configured with a storage engine", () => {
    expect((upload as any).storage).toBeDefined();
  });
});

//request id middlerware
describe("RequestId middleware", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { header: vi.fn() };
    res = { setHeader: vi.fn() };
    next = vi.fn();
  });

  it("generates a new UUID when no x-request-id header is present", async () => {
    req.header.mockReturnValue(undefined);

    await RequestId(req, res, next as any);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe("string");
    // basic UUID v4 shape check
    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("reuses the incoming x-request-id header when present", async () => {
    req.header.mockReturnValue("client-supplied-id-123");

    await RequestId(req, res, next as any);

    expect(req.requestId).toBe("client-supplied-id-123");
  });

  it("generates a new id when incoming header is an empty string", async () => {
    req.header.mockReturnValue("");

    await RequestId(req, res, next as any);

    expect(req.requestId).not.toBe("");
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("generates a new id when incoming header is whitespace only", async () => {
    req.header.mockReturnValue("   ");

    await RequestId(req, res, next as any);

    expect(req.requestId).not.toBe("   ");
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("sets the X-Request-Id response header to match req.requestId", async () => {
    req.header.mockReturnValue("abc-123");

    await RequestId(req, res, next as any);

    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", "abc-123");
  });

  it("sets the response header to the generated id when none was provided", async () => {
    req.header.mockReturnValue(undefined);

    await RequestId(req, res, next as any);

    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
  });

  it("calls next() exactly once with no arguments", async () => {
    req.header.mockReturnValue(undefined);

    await RequestId(req, res, next as any);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls req.header with 'x-request-id'", async () => {
    req.header.mockReturnValue(undefined);

    await RequestId(req, res, next as any);

    expect(req.header).toHaveBeenCalledWith("x-request-id");
  });

  it("does not accept a non-string header value (e.g. array from duplicate headers)", async () => {
    // some header parsers can return string[] for repeated headers
    req.header.mockReturnValue(["dup-1", "dup-2"]);

    await RequestId(req, res, next as any);

    expect(req.requestId).not.toEqual(["dup-1", "dup-2"]);
    expect(typeof req.requestId).toBe("string");
  });
});

//image validations
function mockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: "images",
    originalname: "photo.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024 * 1024, // 1MB
    destination: "./public/temp",
    filename: "photo-123.jpg",
    path: "./public/temp/photo-123.jpg",
    buffer: Buffer.from(""),
    stream: null as any,
    ...overrides,
  };
}

describe("validateImages middleware", () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = { files: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it("calls next() with valid single image", () => {
    req.files = [mockFile()];
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next() with 5 valid images (upper boundary)", () => {
    req.files = Array.from({ length: 5 }, () => mockFile());
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects when req.files is undefined", () => {
    req.files = undefined;
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "At least 1 image(s) required" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when req.files is an empty array", () => {
    req.files = [];
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects when file count exceeds max", () => {
    req.files = Array.from({ length: 6 }, () => mockFile());
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Maximum 5 images allowed" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a disallowed mimetype (e.g. PDF)", () => {
    req.files = [mockFile({ mimetype: "application/pdf" })];
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Invalid file type") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts all default allowed mimetypes", () => {
    const middleware = validateImages();

    for (const mimetype of ["image/jpeg", "image/png", "image/webp"]) {
      req.files = [mockFile({ mimetype })];
      next.mockClear();
      middleware(req, res, next as any);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it("rejects a file exceeding max size", () => {
    req.files = [mockFile({ size: 6 * 1024 * 1024 })]; // 6MB > 5MB default
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("exceeds max size") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a file at exactly the max size boundary", () => {
    req.files = [mockFile({ size: 5 * 1024 * 1024 })]; // exactly 5MB
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects if any file in a mixed batch is invalid", () => {
    req.files = [mockFile(), mockFile({ mimetype: "application/pdf" })];
    const middleware = validateImages();

    middleware(req, res, next as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("respects custom min/max/size/mimetype options", () => {
    const middleware = validateImages({ min: 2, max: 3, maxSizeBytes: 1024, allowedMimeTypes: ["image/png"] });
    req.files = [mockFile({ mimetype: "image/png", size: 500 })];

    middleware(req, res, next as any);

    // only 1 file provided, but min is 2
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "At least 2 image(s) required" })
    );
  });
});