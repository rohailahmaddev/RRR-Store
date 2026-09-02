import request from "supertest";
import { beforeAll, describe, expect, it, } from "vitest";
import app from "../../../app.js";
import { prisma } from "../../../config/database.js";
import { getAccessToken } from "../../../shared/auth/jwt.js";
import { hashPassword } from "../../../shared/utility/helper.js";

const createTestAdminAndGetToken = async (): Promise<string> => {

    const password = await hashPassword(
        "TestAdmin@123"
    );

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
            password,
            is_active: true,
            is_verified: true,
            role: "admin",
        },
    });

    return getAccessToken(admin);
};

describe("PUT /api/products/deactivate-product/:id", () => {
    let adminToken: string;
    beforeAll(async () => {
        adminToken = await createTestAdminAndGetToken();
    });

    it("should deactivate product successfully", async () => {
        const response = await request(app)
            .put(
                "/api/products/deactivate-product/9"
            )
            .set(
                "Cookie",
                [
                    `accessToken=${adminToken}`,
                ]
            );

        console.log(response.body);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "Product listing is deactivated successfully"
        );
    });

    it("should reject invalid product ID", async () => {
        const response = await request(app)
            .put(
                "/api/products/deactivate-product/abc"
            )
            .set(
                "Cookie",
                [
                    `accessToken=${adminToken}`,
                ]
            );

        expect(response.status).toBe(401);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Invalid product ID"
        );
    });

    it("should return 404 for non-existing product", async () => {
        const response = await request(app)
            .put(
                "/api/products/deactivate-product/999999"
            )
            .set(
                "Cookie",
                [
                    `accessToken=${adminToken}`,
                ]
            );

        expect(response.status).toBe(404);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Product not found"
        );
    });

    it("should reject an already deactivated product", async () => {
        const response = await request(app)
            .put(
                "/api/products/deactivate-product/9"
            )
            .set(
                "Cookie",
                [
                    `accessToken=${adminToken}`,
                ]
            );

        expect(response.status).toBe(400);

        expect(response.body.success).toBe(false);

        expect(response.body.message).toBe(
            "Product is already deactivated"
        );
    });

    it("should reject request without authentication", async () => {
        const response = await request(app)
            .put(
                "/api/products/deactivate-product/9"
            );

        expect(response.status).toBe(401);

        expect(response.body.success).toBe(false);
    });
});