import request from "supertest";
import {
  describe,
  expect,
  it,
} from "vitest";

import app from "../../../app.js";

describe(
  "GET /api/products/get-product/:id",
  () => {

    it("should fetch a product successfully", async () => {
      const response = await request(app)
        .get("/api/products/get-product/9");

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.message).toBe(
        "Product fetched successfully"
      );

      expect(response.body.data).toBeDefined();
    });

    it("should reject invalid product ID", async () => {
      const response = await request(app)
        .get(
          "/api/products/get-product/abc"
        );

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toBe(
        "Invalid product ID"
      );
    });

    it("should reject zero product ID", async () => {
      const response = await request(app)
        .get(
          "/api/products/get-product/0"
        );

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toBe(
        "Invalid product ID"
      );
    });

    it("should reject negative product ID", async () => {
      const response = await request(app)
        .get(
          "/api/products/get-product/-9"
        );

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existing product", async () => {
      const response = await request(app)
        .get(
          "/api/products/get-product/999999"
        );

      expect(response.status).toBe(404);

      expect(response.body.success).toBe(false);

      expect(response.body.message).toBe(
        "Product not found"
      );
    });

    it("should return product details", async () => {
      const response = await request(app)
        .get(
          "/api/products/get-product/9"
        );

      console.log(response.body);
      expect(response.status).toBe(200);

      const product =
        response.body.data;

      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("rating");
      expect(product).toHaveProperty(
        "category_name"
      );
      expect(product).toHaveProperty(
        "category_id"
      );
      expect(product).toHaveProperty(
        "product_variants"
      );
      expect(product).toHaveProperty(
        "images"
      );
      expect(product).toHaveProperty(
        "comments"
      );
    });
  }
);