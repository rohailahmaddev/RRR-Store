import { describe, it, expect, vi, beforeEach } from "vitest";
import { forgotPasswordService } from "../../../modules/auth/auth.services.js";
import { getUserByEmailRepo } from "../../../modules/auth/auth.repository.js";
import { updateForgotPasswordToken } from "../../../modules/auth/auth.repository.js";
import { getTemporaryToken } from "../../../shared/auth/jwt.js";
import { sendFogotPasswordEmail } from "../../../infrastructure/email/email.services.js";
import { forgotPasswordController } from "../../../modules/auth/auth.controllers.js";

vi.mock("../../../modules/auth/auth.repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
}));

vi.mock("../../../modules/auth/auth.repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
  updateForgotPasswordToken: vi.fn(),  
}));

//commit this when test services
vi.mock("../../../modules/auth/auth.services.js",() => ({
    forgotPasswordService:vi.fn()
}))

vi.mock("../../../shared/auth/jwt.js", () => ({
  getTemporaryToken: vi.fn(),
}));

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendFogotPasswordEmail: vi.fn(),
}));

describe("forgotPasswordService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate reset token, save it and send email", async () => {
    const user = {
      id: 1,
      email: "rohail@example.com",
      full_name: "Rohail",
    };

    const tokenData = {
      unHashedToken: "raw-token",
      hashedToken: "hashed-token",
      tokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
    };

    vi.mocked(getUserByEmailRepo).mockResolvedValue(user as any);

    vi.mocked(getTemporaryToken).mockReturnValue(tokenData);

    vi.mocked(updateForgotPasswordToken).mockResolvedValue({} as any);

    vi.mocked(sendFogotPasswordEmail).mockResolvedValue(undefined);

    const req = {} as any;

    const result = await forgotPasswordService(
      "user@test.com",
      req
    );

    expect(result).toBeNull();

    expect(getUserByEmailRepo).toHaveBeenCalledWith(
      "user@test.com"
    );

    expect(getTemporaryToken).toHaveBeenCalled();

    expect(updateForgotPasswordToken).toHaveBeenCalledWith(
      1,
      "hashed-token",
      tokenData.tokenExpiry
    );

    expect(sendFogotPasswordEmail).toHaveBeenCalledWith(
      user,
      req,
      "raw-token"
    );
  });

  it("should throw 401 when user does not exist", async () => {
    vi.mocked(getUserByEmailRepo).mockResolvedValue(null);

    const req = {} as any;

    await expect(
      forgotPasswordService("unknown@test.com", req)
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid user.",
    });

    expect(getTemporaryToken).not.toHaveBeenCalled();
    expect(updateForgotPasswordToken).not.toHaveBeenCalled();
    expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
  });

  it("should throw 500 when fetching user fails", async () => {
    vi.mocked(getUserByEmailRepo).mockRejectedValue(
      new Error("DB error")
    );

    const req = {} as any;

    await expect(
      forgotPasswordService("rohail@example.com", req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch user info try again.",
    });
  });

  it("should throw 500 when reset token cannot be saved", async () => {
    const user = {
      id: 1,
      email: "rohail@example.com",
    };

    vi.mocked(getUserByEmailRepo).mockResolvedValue(user as any);

    vi.mocked(getTemporaryToken).mockReturnValue({
      unHashedToken: "raw-token",
      hashedToken: "hashed-token",
      tokenExpiry: new Date(),
    });

    vi.mocked(updateForgotPasswordToken).mockRejectedValue(
      new Error("DB error")
    );

    const req = {} as any;

    await expect(
      forgotPasswordService("rohail@example.com", req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to generate the tokens try again",
    });

    expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
  });
});

describe("forgotPasswordController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 when forgot password succeeds", async () => {
    vi.mocked(forgotPasswordService).mockResolvedValue(
      null
    );

    const req = {
      body: {
        email: "rohail@example.com",
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    await forgotPasswordController(req, res, vi.fn());

    expect(forgotPasswordService).toHaveBeenCalledWith(
      "rohail@example.com",
      req
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalled();
  });
});