import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

import app from "../../../app.js";
import { prisma } from "../../../config/database.js";

describe("GET /api/products/:id/variants", () => {
  let productId: number;

  beforeAll(async () => {
    // Find a product that exists in the test database
    const product = await prisma.products.findFirst({
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new Error(
        "Integration test requires at least one product in the test database"
      );
    }

    productId = product.id;
  });

  // ─────────────────────────────────────
  // SUCCESS
  // ─────────────────────────────────────

  it("should fetch product variants successfully", async () => {
    const response = await request(app)
      .get(`/api/products/${productId}/variants`)
      .expect(200);

    expect(response.body).toMatchObject({
      statusCode: 200,
      message: "Product variants fetched successfully",
    });

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // ─────────────────────────────────────
  // INVALID ID
  // ─────────────────────────────────────

  it.each([
    "abc",
    "0",
    "-1",
    "1.5",
  ])("should return 400 for invalid product ID: %s", async (id) => {
    const response = await request(app)
      .get(`/api/products/${id}/variants`)
      .expect(400);

    expect(response.body.message).toBe("Invalid product ID");
  });

  // ─────────────────────────────────────
  // NON-EXISTENT PRODUCT
  // ─────────────────────────────────────

//   it("should return 200 with empty array for a product with no variants", async () => {
//     // This test is only valid if you have a known product
//     // that exists but has no variants.

//     const productWithoutVariants =
//       await prisma.products.findFirst({
//         where: {
//           product_variants: {
//             none: {},
//           },
//         },
//         select: {
//           id: true,
//         },
//       });

//     if (!productWithoutVariants) {
//       return;
//     }

//     const response = await request(app)
//       .get(
//         `/api/products/${productWithoutVariants.id}/variants`
//       )
//       .expect(200);

//     expect(response.body.message).toBe(
//       "Product variants fetched successfully"
//     );

//     expect(response.body.data).toEqual([]);
//   });

  // ─────────────────────────────────────
  // VERY LARGE ID
  // ─────────────────────────────────────

// q
});