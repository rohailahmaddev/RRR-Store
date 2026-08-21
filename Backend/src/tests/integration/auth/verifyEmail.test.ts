import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../../app.js";

describe("POST /api/auth/verify-email", () => {
  it("should verify email with a valid token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-email/:token")
      .send({
        token: "VALID_TEST_TOKEN",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should reject an invalid token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-email/:token")
      .send({
        token: "invalid-token",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject a missing token", async () => {
    const response = await request(app)
      .post("/api/auth/verify-email/:token")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});