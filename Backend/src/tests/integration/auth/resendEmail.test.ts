import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../../app.js";

describe("POST /api/auth/resend-verification-email", () => {
  it("should resend verification email", async () => {
    const response = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({
        email: "unverified@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should reject invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});