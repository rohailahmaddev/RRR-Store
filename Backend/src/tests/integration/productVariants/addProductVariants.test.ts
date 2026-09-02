import { describe, it, expect, beforeAll, afterAll, } from "vitest";
import request from "supertest";
import app from ".../../../src/app.js";
import { prisma } from ".../../../src/config/database.js";
import { getAccessToken } from ".../../../src/shared/auth/jwt.js";

describe("POST /api/products/:id/variants", () => {
  let adminToken: string;
  let productId: number;

  beforeAll(async () => {
    // Create test admin
    const admin = await prisma.users.upsert({
      where: {
        email: "admin@test.com",
      },
      update: {
        is_active: true,
        is_verified: true,
        role: "admin",
      },
      create: {
        full_name: "Test Admin",
        email: "admin@test.com",
        password: "TestAdmin@123",
        is_active: true,
        is_verified: true,
        role: "admin",
      },
    });

    adminToken = getAccessToken(admin);

    // Get an existing product
    const product = await prisma.products.findFirst({
      where: {
        is_active: true,
      },
    });

    if (!product) {
      throw new Error(
        "No active product found in test database"
      );
    }

    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should add product variants successfully", async () => {
    const productVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "L",
        color: "Black",
        stock: 5,
      },
    ];

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        productVariants: JSON.stringify(productVariants),
    });

    console.log(response.body);
    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      statusCode: 201,
      message: "Product variant added successfully",
    });
  });

  it("should return 400 for invalid product ID", async () => {
    const productVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    const response = await request(app)
      .post("/api/products/abc/variants")
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        productVariants: JSON.stringify(productVariants),
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Invalid product ID"
    );
  });

  it("should return 400 for product ID 0", async () => {
    const productVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    const response = await request(app)
      .post("/api/products/0/variants")
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        productVariants: JSON.stringify(productVariants),
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Invalid product ID"
    );
  });

  it("should return 401 when authentication token is missing", async () => {
    const productVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .send({
        productVariants: JSON.stringify(productVariants),
      });

    expect(response.status).toBe(401);
  });

  it("should return 403 when authenticated user is not an admin", async () => {
    const user = await prisma.users.upsert({
      where: {
        email: "user@test.com",
      },
      update: {
        is_active: true,
        is_verified: true,
      },
      create: {
        full_name: "Test User",
        email: "user@test.com",
        password: "TestUser@123",
        is_active: true,
        is_verified: true,
      },
    });

    const userToken = getAccessToken(user);

    const productVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Cookie", `accessToken=${userToken}`)
      .send({
        productVariants: JSON.stringify(productVariants),
      });

    expect(response.status).toBe(403);
  });

  it("should return 400 when productVariants is invalid", async () => {
    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        productVariants: JSON.stringify([
          {
            size: "",
            color: "",
            stock: -10,
          },
        ]),
      });

    expect(response.status).toBe(400);
  });

  it("should return 400 when productVariants is not a valid JSON string", async () => {
    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set("Cookie", `accessToken=${adminToken}`)
      .send({
        productVariants: "invalid json",
      });

    expect(response.status).toBe(400);
  });
});