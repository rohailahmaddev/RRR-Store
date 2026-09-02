import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "vitest";

import request from "supertest";

import app from ".../../../src/app.js";

import { prisma } from ".../../../src/config/database.js";

import {
  getAccessToken,
} from ".../../../src/shared/auth/jwt.js";

describe(
  "DELETE /api/products/:productId/variants/:variantId",
  () => {
    let adminToken: string;
    let productId: number;
    let variantId: number;

    beforeAll(async () => {
      // Create/find test admin
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

      /*
       * Find an existing product.
       */
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

      /*
       * Find an existing variant belonging to this
       * product.
       *
       * Change `product_variants` if your Prisma
       * model has a different name.
       */
      const variant =
        await prisma.product_variants.findFirst({
          where: {
            product_id: productId,
          },
        });

      if (!variant) {
        throw new Error(
          "No product variant found for test product"
        );
      }

      variantId = variant.id;
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it("should delete product variant successfully", async () => {
      /*
       * Create a dedicated variant for this test so that
       * other tests are not affected.
       *
       * Adjust fields according to your Prisma schema.
       */
      const variant =
        await prisma.product_variants.create({
          data: {
            product_id: productId,
            size_name: "TEST-SIZE",
            color: "TEST-COLOR",
            stock: 10,
          },
        });

      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/${variant.id}`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message:
          "Product variant deleted successfully",
      });

      /*
       * Verify that it was actually deleted.
       */
      const deletedVariant =
        await prisma.product_variants.findUnique({
          where: {
            id: variant.id,
          },
        });

      expect(deletedVariant).toBeNull();
    });

    it("should return 400 for invalid product ID", async () => {
      const response = await request(app)
        .delete(
          `/api/products/abc/variants/${variantId}`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      expect(response.status).toBe(400);

      expect(response.body.message).toBe(
        "Invalid product or variant ID"
      );
    });

    it("should return 400 for product ID 0", async () => {
      const response = await request(app)
        .delete(
          `/api/products/0/variants/${variantId}`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      expect(response.status).toBe(400);

      expect(response.body.message).toBe(
        "Invalid product or variant ID"
      );
    });

    it("should return 400 for invalid variant ID", async () => {
      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/abc`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      expect(response.status).toBe(400);

      expect(response.body.message).toBe(
        "Invalid product or variant ID"
      );
    });

    it("should return 400 for variant ID 0", async () => {
      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/0`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      expect(response.status).toBe(400);

      expect(response.body.message).toBe(
        "Invalid product or variant ID"
      );
    });

    it("should return 401 when authentication token is missing", async () => {
      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/${variantId}`
        );

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

      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/${variantId}`
        )
        .set(
          "Cookie",
          `accessToken=${userToken}`
        );

      expect(response.status).toBe(403);
    });

    it("should not delete a variant belonging to another product", async () => {
      /*
       * Find another product.
       */
      const anotherProduct =
        await prisma.products.findFirst({
          where: {
            id: {
              not: productId,
            },
          },
        });

      if (!anotherProduct) {
        return;
      }

      /*
       * Create variant belonging to another product.
       */
      const anotherVariant =
        await prisma.product_variants.create({
          data: {
            product_id: anotherProduct.id,
            size_name: "TEST-SIZE-2",
            color: "TEST-COLOR-2",
            stock: 10,
          },
        });
        
      const response = await request(app)
        .delete(
          `/api/products/${productId}/variants/${anotherVariant.id}`
        )
        .set(
          "Cookie",
          `accessToken=${adminToken}`
        );

      /*
       * The exact expected status depends on your
       * deleteProductVariant repository implementation.
       *
       * If the repository checks product_id + variant_id,
       * it should normally return 404.
       */
      expect(response.status).toBe(404);

      /*
       * Make sure the variant still exists.
       */
      const variantStillExists =
        await prisma.product_variants.findUnique({
          where: {
            id: anotherVariant.id,
          },
        });

      expect(variantStillExists).not.toBeNull();
    });
  }
);