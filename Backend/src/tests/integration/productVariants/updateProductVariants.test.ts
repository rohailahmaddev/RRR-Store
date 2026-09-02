import { describe, it, expect, beforeAll, afterAll, } from "vitest";
import request from "supertest";
import app from ".../../../src/app.js";
import { prisma } from ".../../../src/config/database.js";
import { getAccessToken } from ".../../../src/shared/auth/jwt.js";

describe("PUT /api/products/:id/variants", () => {
    let adminToken: string;
    let productId: number;

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

        // Find an existing active product
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

    it("should update product variants successfully", async () => {
        const productVariants = [
            {
                size_name: "M",
                color: "Black",
                stock: 20,
            },
            {
                size_name: "L",
                color: "Black",
                stock: 15,
            },
        ];

        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
            });

        expect(response.status).toBe(200);

        expect(response.body).toMatchObject({
            statusCode: 200,
            message:
                "Product variant updated successfully",
        });
    });

    it("should return 400 for invalid product ID", async () => {
        const productVariants = [
            {
                size_name: "M",
                color: "Black",
                stock: 20,
            },
        ];

        const response = await request(app)
            .put("/api/products/abc/variants")
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
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
                stock: 20,
            },
        ];

        const response = await request(app)
            .put("/api/products/0/variants")
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
            "Invalid product ID"
        );
    });

    it("should return 400 when productVariants is not an array", async () => {
        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify({
                    size_name: "M",
                    color: "Black",
                    stock: 20,
                }),
            });

        expect(response.status).toBe(400);
    });

    it("should return 400 when variant data is invalid", async () => {
        const productVariants = [
            {
                size_name: "",
                color: "",
                stock: -10,
            },
        ];

        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
            });

        expect(response.status).toBe(400);
    });

    it("should return 400 for duplicate size and color combination", async () => {
        const productVariants = [
            {
                size_name: "M",
                color: "Black",
                stock: 20,
            },
            {
                size_name: "M",
                color: "Black",
                stock: 30,
            },
        ];

        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
            });

        expect(response.status).toBe(400);
    });

    it("should return 401 when authentication token is missing", async () => {
        const productVariants = [
            {
                size_name: "M",
                color: "Black",
                stock: 20,
            },
        ];

        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
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
                stock: 20,
            },
        ];

        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${userToken}`
            )
            .send({
                productVariants: JSON.stringify(
                    productVariants
                ),
            });

        expect(response.status).toBe(403);
    });

    it("should accept request without productVariants according to current service logic", async () => {
        const response = await request(app)
            .put(`/api/products/${productId}/variants`)
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            )
            .send({});

        /*
         * Your current service allows this:
         *
         * const hasProductVariants =
         *   req?.body?.productVariants !== undefined;
         *
         * If false, it simply returns.
         */
        console.log(response.body);
        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
            "Product variant updated successfully"
        );
    });
}
);