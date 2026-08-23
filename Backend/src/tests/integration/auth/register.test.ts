import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../../config/database.js";

const REGISTER_URL = "/api/auth/register";

describe("POST /auth/register", () => {
 
  //uncommit it when test it delete all previous register user.
  // beforeEach(async () => {
  //   await prisma.users.deleteMany();
  // });

  it("should register a new user successfully", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "rohail@example.com",
      password: "Password@1",
      phone: "03001234567",
    };

    const response = await request(app)
      .post(REGISTER_URL)
      .send(user);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("data");
    expect(response.body.data).toHaveProperty("user");
    expect(response.body.data.user).toMatchObject({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
    });
  });

  it("should reject registration when email already exists", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "rohail@example.com",
      password: "Password@1",
      phone: "03001234567",
    };

    // First registration
    const firstResponse = await request(app)
      .post(REGISTER_URL)
      .send(user);
        
    expect(firstResponse.statusCode).toBe(201);

    // Second registration with same email
    const secondResponse = await request(app)
      .post(REGISTER_URL)
      .send(user);
    expect(secondResponse.statusCode).toBe(409);
  });

  it("should reject registration when email is invalid", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "invalid-email",
      password: "Password@1",
      phone: "03001234567",
    };

    const response = await request(app)
      .post(REGISTER_URL)
      .send(user);

    expect(response.statusCode).toBe(400);
  });

  it("should reject registration when password is invalid", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "rohail@example.com",
      password: "123",
      phone: "03001234567",
    };

    const response = await request(app)
      .post(REGISTER_URL)
      .send(user);

    expect(response.statusCode).toBe(400);
  });

  it("should reject registration when required fields are missing", async () => {
    const response = await request(app)
      .post(REGISTER_URL)
      .send({
        email: "rohail@example.com",
        password: "Password@1",
      });

    expect(response.statusCode).toBe(400);
  });

  it("should reject registration when email is already registered", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "existing@example.com",
      password: "Password@1",
      phone: "03001234567",
    };

    await request(app)
      .post(REGISTER_URL)
      .send(user);

    const response = await request(app)
      .post(REGISTER_URL)
      .send({
        ...user,
        full_name: "Another User",
      });
    
    expect(response.status).toBe(409);

    expect(response.body.success).toBe(false);
  });

  it("should not return the user's password", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "rohail@example.com",
      password: "Password@1",
      phone: "03001234567",
    };

    const response = await request(app)
      .post(REGISTER_URL)
      .send(user);

    expect(response.statusCode).toBe(201);

    expect(response.body.data.user).not.toHaveProperty("password");
  });

  it("should create the user in the database", async () => {
    const user = {
      full_name: "Rohail Rao",
      email: "rohail@example.com",
      password: "Password@1",
      phone: "03001234567",
    };

    const response = await request(app)
      .post(REGISTER_URL)
      .send(user);

    expect(response.statusCode).toBe(201);

    const createdUser = await prisma.users.findUnique({
      where: {
        email: user.email,
      },
    });

    expect(createdUser).not.toBeNull();

    expect(createdUser?.full_name).toBe(user.full_name);
    expect(createdUser?.email).toBe(user.email);
    expect(createdUser?.phone).toBe(user.phone);
  });

});

