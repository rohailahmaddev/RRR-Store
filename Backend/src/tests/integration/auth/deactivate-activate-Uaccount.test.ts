import { describe, it, expect, beforeAll, afterAll, } from "vitest";
import request from "supertest";
import app from "../../../app.js";
import { prisma } from "../../../config/database.js";

describe("Admin user activation/deactivation", () => {
    let adminCookie: string;
    let testUserId: number;

    beforeAll(async () => {
        /*
         * Find the admin account.
         * We are using the existing admin credentials:
         *
         * email: test@gmail.com
         * password: test1234
         */

        const loginResponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@gmail.com",
                password: "test1234",
            });

        expect(loginResponse.status).toBe(200);

        /*
         * Save authentication cookies.
         */
        adminCookie = loginResponse.headers["set-cookie"] as string;

        expect(adminCookie).toBeDefined();

        /*
         * Create a test user.
         *
         * Change these fields according to your Prisma User model.
         */
        const user = await prisma.users.create({
            data: {
                full_name: "Ali Ahmad",
                email: `activation-test-${Date.now()}@test.com`,
                password: "ali12345",
                is_active: true,
            },
        });

        testUserId = user.id;
    });

    afterAll(async () => {
        /*
         * Remove test user.
         */
        if (testUserId) {
            await prisma.users.delete({
                where: {
                    id: testUserId,
                },
            });
        }

        await prisma.$disconnect();
    });

    it("should deactivate a user successfully", async () => {
        const response = await request(app)
            .patch(`/api/auth/admin/user/${testUserId}/deactivate`)
            .set("Cookie", adminCookie);


        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "User account deactivated successfully."
        );

        /*
         * Verify actual database state.
         */
        const user = await prisma.users.findUnique({
            where: {
                id: testUserId,
            },
        });

        expect(user?.is_active).toBe(false);
    });

    it("should not deactivate an already deactivated user", async () => {
        const response = await request(app)
            .patch(`/api/auth/admin/user/${testUserId}/deactivate`)
            .set("Cookie", adminCookie);

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
            "User account is already deactivated."
        );
    });

    it("should activate a deactivated user successfully", async () => {
        const response = await request(app)
            .patch(`/api/auth/admin/user/${testUserId}/activate`)
            .set("Cookie", adminCookie);

        console.log(response.body);

        expect(response.status).toBe(200);

        expect(response.body.success).toBe(true);

        expect(response.body.message).toBe(
            "User account activated successfully."
        );

        /*
         * Verify actual database state.
         */
        const user = await prisma.users.findUnique({
            where: {
                id: testUserId,
            },
        });

        expect(user?.is_active).toBe(true);
    });

    it("should not activate an already active user", async () => {
        const response = await request(app)
            .patch(`/api/auth/admin/user/${testUserId}/activate`)
            .set("Cookie", adminCookie);

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
            "User account is already activated."
        );
    });

    it("should return 404 when user does not exist", async () => {
        const response = await request(app)
            .patch("/api/auth/admin/user/999999/deactivate")
            .set("Cookie", adminCookie);

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
            "User not found."
        );
    });

    it("should not allow deactivating an admin account", async () => {
        const admin = await prisma.users.findUnique({
            where: {
                email: "test@gmail.com",
            },
        });

        const response = await request(app)
            .patch(`/api/auth/admin/user/${admin!.id}/deactivate`)
            .set("Cookie", adminCookie);

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
            "Admin accounts cannot be deactivated."
        );
    });
});