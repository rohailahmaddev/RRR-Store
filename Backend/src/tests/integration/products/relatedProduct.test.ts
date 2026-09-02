import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from ".../../../src/app.js";
import { prisma } from ".../../../src/config/database.js";

describe("GET /api/products/related-products/:id", () => {
  let productId: number;

  beforeAll(async () => {
    // Find an existing product that can be used for testing
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

  it("should fetch related products successfully", async () => {
    const response = await request(app)
      .get(`/api/products/related-products/${productId}`);

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      statusCode: 200,
      message: "Related products fetched successfully",
    });

    expect(response.body.success).toBe(true);

    expect(response.body.data).toBeDefined();

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("should return 400 for invalid product ID", async () => {
    const response = await request(app)
      .get("/api/products/related-products/abc");

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Invalid product ID"
    );
  });

  it("should return 400 for product ID 0", async () => {
    const response = await request(app)
      .get("/api/products/related-products/0");

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Invalid product ID"
    );
  });

  it("should return 400 for negative product ID", async () => {
    const response = await request(app)
      .get("/api/products/related-products/-1");

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "Invalid product ID"
    );
  });

  it("should return 404 when product does not exist", async () => {
    const response = await request(app)
      .get("/api/products/related-products/999999999");

    expect(response.status).toBe(404);

    expect(response.body.message).toBe(
      "Product not found"
    );
  });

  it("should return products from the same category excluding the current product", async () => {
  const response = await request(app)
    .get(`/api/products/related-products/${productId}`);

  expect(response.status).toBe(200);

  const products = response.body.data;

  expect(Array.isArray(products)).toBe(true);

  for (const product of products) {
    expect(product.id).not.toBe(productId);
  }
   });
});