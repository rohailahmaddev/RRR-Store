import { beforeAll, afterAll, describe, expect, it, } from "vitest";
import request from "supertest";
import app  from "../../../app.js";
import { prisma } from "../../../config/database.js";


describe("PUT /api/products/:id", () => {

  let productId: number;


  beforeAll(async () => {

    const product = await prisma.products.create({
      data: {
        name: "Test Product",
        sku: "TEST-001",
        description: "Test description",
        price: 1000,
        category_id: 1,
      },
    });

    productId = product.id;
  });


  afterAll(async () => {

    await prisma.products.delete({
      where: {
        id: productId,
      },
    });

    await prisma.$disconnect();
  });


  it("should update product successfully", async () => {

    const response = await request(app)
      .put(`/api/products/update-product/${productId}`)
      .field(
        "productName",
        "Updated Test Product"
      )
      .field(
        "description",
        "Updated description"
      )
      .field(
        "price",
        "1500"
      )
      .field(
        "sku",
        "TEST-UPDATED"
      )
      .field(
        "category_id",
        "29"
      )
      .field(
        "productVariants",
        JSON.stringify([
          {
            size_name: "M",
            color: "Black",
            stock: 50,
          },
        ])
      )
      .field(
        "deletedImageIds",
        JSON.stringify([])
      );

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      statusCode: 200,
      message: "Product updated successfully",
    });


    // Verify actual database
    const updatedProduct =
      await prisma.products.findUnique({
        where: {
          id: productId,
        },
      });


    expect(updatedProduct?.name)
      .toBe("Updated Test Product");

    expect(updatedProduct?.sku)
      .toBe("TEST-UPDATED");

    expect(Number(updatedProduct?.price))
      .toBe(1500);
  });


  it("should return 404 when product does not exist", async () => {

    const response = await request(app)
      .put("/api/products/update-product/99999")
      .field(
        "productName",
        "Updated Product"
      )
      .field(
        "price",
        "1000"
      );


    expect(response.status)
      .toBe(404);
  });


  it("should reject invalid price", async () => {

    const response = await request(app)
      .put(`/api/products/update-product/${productId}`)
      .field(
        "price",
        "abc"
      );

    expect(response.status)
      .toBe(400);
  });


  it("should reject invalid variants", async () => {

    const response = await request(app)
      .put(`/api/products/update-product/${productId}`)
      .field(
        "productVariants",
        "invalid-json"
      );


    expect(response.status)
      .toBe(400);
  });

});