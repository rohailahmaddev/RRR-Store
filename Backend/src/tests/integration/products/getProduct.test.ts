import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../../app.js";

describe("GET /api/products/get-products", () => {
  it("should fetch products successfully", async () => {
    const response = await request(app)
      .get("/api/products/get-products");

    console.log(response);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      "Products fetched successfully"
    );

    expect(response.body.data).toHaveProperty(
      "products"
    );

    expect(response.body.data).toHaveProperty(
      "pagination"
    );

  });

  it("should return default pagination", async () => {
    const response = await request(app)
      .get("/api/products/get-products");

    expect(response.status).toBe(200);

    expect(
      response.body.data.pagination.currentPage
    ).toBe(1);

    expect(
      response.body.data.pagination.limit
    ).toBe(20);

    expect(
      response.body.data.pagination
    ).toHaveProperty("totalProducts");

    expect(
      response.body.data.pagination
    ).toHaveProperty("totalPages");
  });

  it("should filter products by search name", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        search_name: "iphone",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(
      response.body.data
    ).toHaveProperty("products");

    expect(
      response.body.data
    ).toHaveProperty("pagination");
  });

  it("should filter products by category", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        categoryId: 1,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should filter products by minimum price", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        min_price: 100,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should filter products by maximum price", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        max_price: 1000,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should filter products by price range", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        min_price: 100,
        max_price: 1000,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should sort products by ascending price", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        sort_by: "price_asc",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should sort products by descending price", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        sort_by: "price_desc",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should sort products by newest", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        sort_by: "newest",
      });

    console.log(response)
    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should support pagination", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        page: 2,
        limit: 5,
      });

    expect(response.status).toBe(200);

    expect(
      response.body.data.pagination.currentPage
    ).toBe(2);

    expect(
      response.body.data.pagination.limit
    ).toBe(5);
  });

  it("should support combined filters", async () => {
    const response = await request(app)
      .get("/api/products/get-products")
      .query({
        search_name: "phone",
        categoryId: 1,
        min_price: 100,
        max_price: 2000,
        sort_by: "price_asc",
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(
      response.body.data.pagination.currentPage
    ).toBe(1);

    expect(
      response.body.data.pagination.limit
    ).toBe(10);
  });

});