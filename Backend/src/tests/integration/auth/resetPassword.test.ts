import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetPasswordService, } from "../../../modules/auth/auth.services.js";
import { getUserByResetPasswordToken, updateUserPasswordById, } from "../../../modules/auth/auth.repository.js";
import { hashToken } from "../../../shared/utility/helper.js";
import { hashPassword } from "../../../shared/utility/helper.js";
import { resetPasswordController } from "../../../modules/auth/auth.controllers.js";

//commit this when test services
vi.mock("../../../modules/auth/auth.services.js",()=>({
    resetPasswordService:vi.fn()
}))
vi.mock("../../../modules/auth/auth.repository.js", () => ({
  getUserByResetPasswordToken: vi.fn(),
  updateUserPasswordById: vi.fn(),
}));

vi.mock("../../../shared/utility/helper.js", () => ({
  hashToken:vi.fn(),
  hashPassword: vi.fn(),
}));

describe("resetPasswordService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reset password successfully", async () => {
    const user = [
      {
        id: 1,
        email: "rohail@example.com",
      },
    ];

    vi.mocked(hashToken).mockReturnValue("hashed-reset-token");
    vi.mocked(getUserByResetPasswordToken).mockResolvedValue( user as any );
    vi.mocked(hashPassword).mockResolvedValue( "hashed-new-password" );
    vi.mocked(updateUserPasswordById).mockResolvedValue( undefined );

    const result = await resetPasswordService(
      "raw-reset-token",
      "Password123!"
    );

    expect(result).toBeUndefined();

    expect(hashToken).toHaveBeenCalledWith(
      "raw-reset-token"
    );

    expect(getUserByResetPasswordToken).toHaveBeenCalledWith(
      "hashed-reset-token"
    );

    expect(hashPassword).toHaveBeenCalledWith(
      "Password123!"
    );

    expect(updateUserPasswordById).toHaveBeenCalledWith(
      1,
      "hashed-new-password"
    );
  });

  it("should throw 400 when reset token is invalid", async () => {
    vi.mocked(hashToken).mockReturnValue(
      "hashed-reset-token"
    );

    vi.mocked(getUserByResetPasswordToken).mockResolvedValue(
      []
    );

    await expect(
      resetPasswordService(
        "invalid-token",
        "Password123!"
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "Invalid user or reset time is over. Please request a new password reset link.",
    });

    expect(hashPassword).not.toHaveBeenCalled();

    expect(updateUserPasswordById).not.toHaveBeenCalled();
  });

  it("should throw 500 when finding user fails", async () => {
    vi.mocked(hashToken).mockReturnValue(
      "hashed-reset-token"
    );

    vi.mocked(
      getUserByResetPasswordToken
    ).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      resetPasswordService(
        "raw-token",
        "Password123!"
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to found the user try again.",
    });
  });

  it("should throw 500 when password update fails", async () => {
    vi.mocked(hashToken).mockReturnValue(
      "hashed-reset-token"
    );

    vi.mocked(getUserByResetPasswordToken).mockResolvedValue([
      {
        id: 1,
        email: "rohail@example.com",
      },
    ] as any);

    vi.mocked(hashPassword).mockResolvedValue(
      "hashed-new-password"
    );

    vi.mocked(updateUserPasswordById).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      resetPasswordService(
        "raw-token",
        "Password123!"
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to update the password try again.",
    });
  });
});

describe("resetPasswordController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 when password reset succeeds", async () => {
    vi.mocked(resetPasswordService).mockResolvedValue(
      undefined
    );

    const req = {
      params: {
        token: "raw-reset-token",
      },
      body: {
        newPassword: "Password123!",
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    await resetPasswordController(req, res, vi.fn());

    expect(resetPasswordService).toHaveBeenCalledWith(
      "raw-reset-token",
      "Password123!"
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalled();
  });
});

