import { describe, expect, it, vi, beforeEach } from "vitest";

import { logoutUserService } from "../../../modules/auth/auth.services.js";
import { logoutUser } from "../../../modules/auth/auth.repository.js";
import { hashToken } from "../../../shared/utility/helper.js";

vi.mock("../../../modules/auth/auth.repository.js", () => ({
  logoutUser: vi.fn(),
}));

vi.mock("../../../shared/utility/helper.js", () => ({
  hashToken: vi.fn(),
}));

describe("logoutUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should logout successfully with valid tokens", async () => {
    vi.mocked(hashToken).mockReturnValue("hashed-refresh-token");
    vi.mocked(logoutUser).mockResolvedValue(undefined);

    await expect(
      logoutUserService("valid-access-token", "valid-refresh-token")
    ).resolves.toBeUndefined();

    expect(hashToken).toHaveBeenCalledWith("valid-refresh-token");

    expect(logoutUser).toHaveBeenCalledWith(
      "hashed-refresh-token"
    );
  });

  it("should throw 400 when access token is missing", async () => {
    await expect(
      logoutUserService("", "valid-refresh-token")
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No tokens found in cookies",
    });

    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("should throw 400 when refresh token is missing", async () => {
    await expect(
      logoutUserService("valid-access-token", "")
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No tokens found in cookies",
    });

    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("should throw 400 when access token contains only spaces", async () => {
    await expect(
      logoutUserService("   ", "valid-refresh-token")
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No tokens found in cookies",
    });

    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("should throw 400 when refresh token contains only spaces", async () => {
    await expect(
      logoutUserService("valid-access-token", "   ")
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No tokens found in cookies",
    });

    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("should throw 500 when logoutUser fails", async () => {
    vi.mocked(hashToken).mockReturnValue("hashed-refresh-token");

    vi.mocked(logoutUser).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      logoutUserService(
        "valid-access-token",
        "valid-refresh-token"
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to logout.",
    });
  });
});

// npx vitest run src/tests/unit/auth/logout.service.test.ts

import request from "supertest";
import app from "../../../app.js";

describe("POST /api/auth/logout", () => {
  it("should logout successfully", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set(
        "Cookie",
        [
          "accessToken=test-access-token",
          "refreshToken=test-refresh-token",
        ]
      );

    console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Logout successfully");

    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("should reject logout when cookies are missing", async () => {
    const response = await request(app)
      .post("/api/auth/logout");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
      "No tokens found in cookies"
    );
  });
});