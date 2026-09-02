import { beforeAll, beforeEach, describe, expect, it, } from "vitest";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../../config/database.js";
import { hashPassword, } from "../../../shared/utility/helper.js";
import { getAccessToken, } from "../../../shared/auth/jwt.js";

const createTestAdminAndGetToken = async (): Promise<string> => {

    const password = await hashPassword(
        "TestAdmin@123"
    );

    const admin = await prisma.users.upsert({
        where: {
            email: "admin@test.com",
        },

        update: {
            password,
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

describe("PUT /api/products/activate-product/:id", () => {

    let adminToken: string;


    beforeAll(async () => {

        adminToken =
            await createTestAdminAndGetToken();

    });

    beforeEach(async () => {
        await prisma.products.update({
            where: {
                id: 9,
            },

            data: {
                is_active: false,
            },
        });

    });


    it("should activate an inactive product successfully", async () => {

        const response = await request(app)
            .put(
                "/api/products/activate-product/9"
            )
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            );


        console.log(response.body);


        expect(response.status)
            .toBe(200);


        expect(response.body.success)
            .toBe(true);


        expect(response.body.message)
            .toBe(
                "Product listing is activated successfully"
            );


        const product =
            await prisma.products.findUnique({
                where: {
                    id: 9,
                },
            });


        expect(product?.is_active)
            .toBe(true);
    }
    );


    it("should reject invalid product ID", async () => {

        const response = await request(app)
            .put(
                "/api/products/activate-product/abc"
            )
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            );


        expect(response.status)
            .toBe(400);


        expect(response.body.success)
            .toBe(false);


        expect(response.body.message)
            .toBe(
                "Invalid product ID"
            );
    }
    );


    it("should reject zero product ID", async () => {
        const response = await request(app)
            .put(
                "/api/products/activate-product/0"
            )
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            );


        expect(response.status)
            .toBe(400);


        expect(response.body.success)
            .toBe(false);
    }
    );


    it("should return 404 when product does not exist", async () => {

        const response = await request(app)
            .put(
                "/api/products/activate-product/999999"
            )
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            );


        expect(response.status)
            .toBe(404);


        expect(response.body.success)
            .toBe(false);


        expect(response.body.message)
            .toBe(
                "Product not found"
            );
    }
    );


    it("should reject an already activated product", async () => {

        await prisma.products.update({
            where: {
                id: 9,
            },

            data: {
                is_active: true,
            },
        });


        const response = await request(app)
            .put(
                "/api/products/activate-product/9"
            )
            .set(
                "Cookie",
                `accessToken=${adminToken}`
            );


        expect(response.status)
            .toBe(400);


        expect(response.body.success)
            .toBe(false);


        expect(response.body.message)
            .toBe(
                "Product is already activated"
            );
    }
    );


    it("should reject request without authentication", async () => {

        const response = await request(app)
            .put(
                "/api/products/activate-product/9"
            );


        expect(response.status)
            .toBe(401);


        expect(response.body.success)
            .toBe(false);
    }
    );


    it("should reject non-admin user", async () => {
        /*
         * Create a normal user and generate
         * a real JWT for that user.
         */

        const password = await hashPassword(
            "TestUser@123"
        );


        const user =
            await prisma.users.upsert({
                where: {
                    email: "user@test.com",
                },

                update: {
                    password,
                    is_active: true,
                    is_verified: true,
                },

                create: {
                    full_name: "Test User",
                    email: "user@test.com",
                    password,
                    is_active: true,
                    is_verified: true,
                },
            });


        const userToken =
            getAccessToken(user);


        const response = await request(app)
            .put(
                "/api/products/activate-product/9"
            )
            .set(
                "Cookie",
                `accessToken=${userToken}`
            );


        expect(response.status)
            .toBe(403);


        expect(response.body.success)
            .toBe(false);
    }
    );

}
);