import request from "supertest";
import { describe, expect, it,vi } from "vitest";
import app from "../../../app.js";
import {sendVerificationEmail} from "../../../infrastructure/email/email.services.js"

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
}));


describe("POST /api/auth/login", () => {
  it("should login a verified user with correct credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "rohail@example.com",
        password: "Password@1",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("User logged in successfully.");

    expect(response.body.data).toHaveProperty("user");
    expect(response.body.data.user.email).toBe("rohail@example.com");

    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.body.data).toHaveProperty("refreshToken");

    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("should reject login when email does not exist", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "doesnotexist@example.com",
        password: "test1234",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid email. Please register first."
    );
  });

  it("should reject login when password is incorrect", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "rohail@example.com",
        password: "wrong-password",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);

    expect(response.body.message).toMatch(
      `Invalid password remaining attempts 3`
    );
  });

  it("should reject login when user exists but email is not verified", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "A@gmail.com",
        password: "140986Ra",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      "User already exist but not verified. Please check your email for verification link."
    );

    expect(sendVerificationEmail).toHaveBeenCalled();
  });

  it("should lock account after 5 failed login attempts", async () => {
  // perform 5 failed requests

  for (let i = 1; i <= 5; i++) {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "rohail@example.com",
        password: "wrong-password",
      });

    expect(response.status).toBe(401);
  }

  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: "rohail@example.com",
      password: "Password@1",
    });

  expect(response.status).toBe(429);
  });

});
