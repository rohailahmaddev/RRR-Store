import { beforeEach, describe, expect, it, vi, } from "vitest";
import { reshfreshTokenService } from "../../../modules/auth/auth.services.js";
import { selectRefreshToken, getUserById, } from "../../../modules/auth/auth.repository.js";
import { hashToken } from "../../../shared/utility/helper.js";
import { getAccessAndRefreshToken } from "../../../shared/utility/helper.js";
import { revokeTokenChain } from "../../../shared/utility/helper.js";

vi.mock("../../../modules/auth/auth.repository.js", () => ({
    selectRefreshToken: vi.fn(),
    getUserById: vi.fn(),
}));

vi.mock("../../../shared/utility/helper.js", () => ({
    hashToken: vi.fn(),
    getAccessAndRefreshToken:vi.fn(),
    revokeTokenChain: vi.fn(),
}));

describe("refreshToken", () => {
    it("should throw 400 when refresh token is missing", async () => {
        const req = {} as any;
        const res = {} as any;

        await expect(
            reshfreshTokenService("", req, res)
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "No refresh token found in cookies",
        });
    });

    it("should throw 500 when refresh token lookup fails", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockRejectedValue(
                new Error("Database error")
            );

            const req = {} as any;
            const res = {} as any;

            await expect(
                reshfreshTokenService(
                    "refresh-token",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 500,
                message: "Failed to refresh the token.",
            });
    });

    it("should reject an invalid refresh token", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([]);

            const clearCookie = vi.fn();

            const req = {} as any;

            const res = {
                clearCookie,
            } as any;

            await expect(
                reshfreshTokenService(
                    "invalid-token",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid refresh token",
            });

            expect(clearCookie).toHaveBeenCalledWith("accessToken");
            expect(clearCookie).toHaveBeenCalledWith("refreshToken");
    });

    it("should detect refresh token reuse", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([
                {
                    id: 10,
                    user_id: 1,
                    is_revoked: true,
                    expire_at: new Date(Date.now() + 60_000),
                },
            ] as any);

            vi.mocked(revokeTokenChain).mockResolvedValue(undefined);

            const clearCookie = vi.fn();

            const req = {} as any;

            const res = {
                clearCookie,
            } as any;

            await expect(
                reshfreshTokenService(
                    "refreshToken",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Token reuse detected, session revoked",
            });

            expect(revokeTokenChain).toHaveBeenCalledWith(10);

            expect(clearCookie).toHaveBeenCalledWith("accessToken");
            expect(clearCookie).toHaveBeenCalledWith("refreshToken");
    });

    it("should reject an expired refresh token", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([
                {
                    id: 10,
                    user_id: 1,
                    is_revoked: false,
                    expire_at: new Date(Date.now() - 60_000),
                },
            ] as any);

            const clearCookie = vi.fn();

            const req = {} as any;

            const res = {
                clearCookie,
            } as any;

            await expect(
                reshfreshTokenService(
                    "expired-token",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Refresh token expired",
            });

            expect(clearCookie).toHaveBeenCalledWith("accessToken");
            expect(clearCookie).toHaveBeenCalledWith("refreshToken");
    });

    it("should reject when refresh token belongs to invalid user", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([
                {
                    id: 10,
                    user_id: 999,
                    is_revoked: false,
                    expire_at: new Date(Date.now() + 60_000),
                },
            ] as any);

            vi.mocked(getUserById).mockResolvedValue(null);

            const req = {} as any;
            const res = {} as any;

            await expect(
                reshfreshTokenService(
                    "refreshToken",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid user.",
            });
    });

    it("should reject refresh when account is locked", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([
                {
                    id: 10,
                    user_id: 1,
                    is_revoked: false,
                    expire_at: new Date(Date.now() + 60_000),
                },
            ] as any);

            vi.mocked(getUserById).mockResolvedValue({
                id: 1,
                locked_until: new Date(Date.now() + 5 * 60_000),
            } as any);

            const req = {
                headers: {},
                ip: "127.0.0.1",
            } as any;

            const res = {} as any;

            await expect(
                reshfreshTokenService(
                    "refreshToken",
                    req,
                    res
                )
            ).rejects.toMatchObject({
                statusCode: 429,
            });
    });

    it("should refresh tokens successfully", async () => {
            vi.mocked(hashToken).mockReturnValue("hashed-token");

            vi.mocked(selectRefreshToken).mockResolvedValue([
                {
                    id: 10,
                    user_id: 1,
                    is_revoked: false,
                    expire_at: new Date(Date.now() + 10 * 60_000),
                },
            ] as any);

            vi.mocked(getUserById).mockResolvedValue({
                id: 1,
                locked_until: null,
            } as any);

            vi.mocked(getAccessAndRefreshToken).mockResolvedValue({
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
            } as any);

            const req = {
                headers: {
                    "user-agent": "Vitest",
                },
                ip: "127.0.0.1",
            } as any;

            const res = {} as any;

            const result = await reshfreshTokenService(
                "old-refresh-token",
                req,
                res
            );

            expect(result.accessToken).toBe("new-access-token");
            expect(result.newRefreshToken).toBe("new-refresh-token");

            expect(result.cookieOptions).toMatchObject({
                httpOnly: true,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
    });

})


import request from "supertest";

import app from "../../../app.js";

describe("POST /api/auth/refresh-token", () => {
    it("should refresh access and refresh tokens", async () => {
        const response = await request(app)
            .post("/api/auth/refresh-token")
            .set(
                "Cookie",
                "refreshToken=3e5dd317125586bd2413b36eedeb1b4a2a498bbe444f1d7dde88c029368c748b"
            );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        expect(response.body.data).toHaveProperty(
            "accessToken"
        );

        expect(response.body.data).toHaveProperty(
            "newRefreshToken"
        );

        expect(response.headers["set-cookie"]).toBeDefined();
    });
});