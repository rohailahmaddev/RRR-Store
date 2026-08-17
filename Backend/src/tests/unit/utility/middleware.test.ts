import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { verifyJWT } from "../../../middlewares/auth.middleware.js";
import { prisma } from "../../../config/database.js"; // adjust path
import { ApiError } from "../../../shared/utility/ApiError.js";

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