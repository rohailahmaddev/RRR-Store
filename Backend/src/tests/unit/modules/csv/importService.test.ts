import { beforeEach, describe, expect, it, vi } from "vitest";
import { importCSVServices } from "../../../../modules/csv/csv.services.js";
import { createProductByCSV, createProductVariantsByCSV, getExistingProductBySku, updateExistingProduct, } from "../../../../modules/csv/csv.repository.js";
import { auditLogs } from "../../../../modules/logs/logs.services.js";
import { insertCategoriesService } from "../../../../modules/categories/categories.services.js";
import { prisma } from "../../../../config/database.js";
import fs from "fs";
import { ApiError } from "../../../../shared/utility/ApiError.js";

vi.mock("../../../../modules/csv/csv.repository.js", () => ({
    createProductByCSV: vi.fn(),
    createProductVariantsByCSV: vi.fn(),
    getExistingProductBySku: vi.fn(),
    updateExistingProduct: vi.fn(),
}));

vi.mock("../../../../modules/logs/logs.services.js", () => ({
    auditLogs: vi.fn(),
}));

vi.mock("../../../../modules/products/product.services.js", () => ({
    insertCategoriesService: vi.fn(),
}));

vi.mock("../../../../config/database.js", () => ({
    prisma: {
        $transaction: vi.fn(),
    },
}));

vi.mock("fs", () => ({
    default: {
        createReadStream: vi.fn(),
        unlinkSync: vi.fn(),
    },
}));

vi.mock("csv-parser", () => ({
    default: vi.fn(() => ({
        on: vi.fn(),
    })),
}));

function mockCSVStream(rows: any[]) {
    const handlers: Record<string, Function> = {};

    const stream = {
        pipe: vi.fn(() => stream),

        on: vi.fn((event: string, callback: Function) => {
            handlers[event] = callback;

            if (event === "data") {
                rows.forEach((row) => callback(row));
            }

            if (event === "end") {
                callback();
            }

            return stream;
        }),
    };

    return stream;
}

describe("importCSVServices", () => {
    const mockReq = {
        user: {
            id: 1,
        },
        ip: "127.0.0.1",
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw error when file path is missing", async () => {
        await expect(
            importCSVServices(mockReq, undefined)
        ).rejects.toThrow("CSV file is required");
    });

    it("should throw error when CSV is empty", async () => {
        const stream = mockCSVStream([]);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        await expect(
            importCSVServices(mockReq, "products.csv")
        ).rejects.toThrow("CSV file is empty");

        expect(fs.unlinkSync).toHaveBeenCalledWith("products.csv");
    });

    it("should throw ApiError when required CSV fields are missing", async () => {
        const rows = [
            {
                productName: "",
                sku: "SKU001",
                price: "1000",
                categoryName: "Clothes",
            },
        ];

        const stream = mockCSVStream(rows);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        await expect(
            importCSVServices(mockReq, "products.csv")
        ).rejects.toThrow(ApiError);

        expect(fs.unlinkSync).toHaveBeenCalledWith("products.csv");
    });

    it("should import valid products successfully", async () => {
        const rows = [
            {
                productName: "T-Shirt",
                sku: "TS001",
                price: "1000",
                description: "Cotton shirt",
                categoryName: "Clothes",
                size_name: "Large",
                color: "Black",
                stock: "10",
            },
        ];

        const stream = mockCSVStream(rows);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        vi.mocked(insertCategoriesService).mockResolvedValue(5);

        vi.mocked(getExistingProductBySku).mockResolvedValue(null);

        vi.mocked(createProductByCSV).mockResolvedValue({
            id: 100,
        } as any);

        vi.mocked(createProductVariantsByCSV).mockResolvedValue(
            {} as any
        );

        vi.mocked(prisma.$transaction).mockImplementation(
            async (callback: any) => {
                return callback("mockTransaction");
            }
        );

        const result = await importCSVServices(
            mockReq,
            "products.csv"
        );

        expect(result).toBeUndefined();

        expect(fs.unlinkSync).toHaveBeenCalledWith(
            "products.csv"
        );

        expect(insertCategoriesService).toHaveBeenCalledWith(
            "Clothes",
            "mockTransaction"
        );

        expect(getExistingProductBySku).toHaveBeenCalledWith(
            "TS001",
            "mockTransaction"
        );

        expect(createProductByCSV).toHaveBeenCalledWith(
            expect.objectContaining({
                productName: "T-Shirt",
                sku: "TS001",
                price: "1000",
            }),
            5,
            "mockTransaction"
        );

        expect(createProductVariantsByCSV).toHaveBeenCalledWith(
            {
                size_name: "Large",
                color: "Black",
                stock: "10",
            },
            100,
            "mockTransaction"
        );

        expect(auditLogs).toHaveBeenCalledTimes(1);
    });

    it("should update an existing product instead of creating it", async () => {
        const rows = [
            {
                productName: "T-Shirt",
                sku: "TS001",
                price: "1200",
                categoryName: "Clothes",
                stock: "20",
            },
        ];

        const stream = mockCSVStream(rows);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        vi.mocked(insertCategoriesService).mockResolvedValue(5);

        vi.mocked(getExistingProductBySku).mockResolvedValue({
            id: 100,
        } as any);

        vi.mocked(prisma.$transaction).mockImplementation(
            async (callback: any) => {
                return callback("mockTransaction");
            }
        );

        await importCSVServices(mockReq, "products.csv");

        expect(updateExistingProduct).toHaveBeenCalledWith(
            100,
            expect.objectContaining({
                sku: "TS001",
            }),
            5,
            "mockTransaction"
        );

        expect(createProductByCSV).not.toHaveBeenCalled();

        expect(createProductVariantsByCSV).not.toHaveBeenCalled();
    });

    it("should throw ApiError when transaction fails", async () => {
        const rows = [
            {
                productName: "T-Shirt",
                sku: "TS001",
                price: "1000",
                categoryName: "Clothes",
                stock: "10",
            },
        ];

        const stream = mockCSVStream(rows);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        vi.mocked(prisma.$transaction).mockRejectedValue(
            new Error("Database transaction failed")
        );

        await expect(
            importCSVServices(mockReq, "products.csv")
        ).rejects.toThrow(
            "Failed to import the product CSV."
        );

        expect(auditLogs).not.toHaveBeenCalled();
    });

    it("should create default variant when CSV has no variant", async () => {
        const rows = [
            {
                productName: "Cap",
                sku: "CAP001",
                price: "500",
                categoryName: "Accessories",
            },
        ];

        const stream = mockCSVStream(rows);

        vi.mocked(fs.createReadStream).mockReturnValue(
            stream as any
        );

        vi.mocked(insertCategoriesService).mockResolvedValue(3);

        vi.mocked(getExistingProductBySku).mockResolvedValue(null);

        vi.mocked(createProductByCSV).mockResolvedValue({
            id: 200,
        } as any);

        vi.mocked(prisma.$transaction).mockImplementation(
            async (callback: any) => {
                return callback("mockTransaction");
            }
        );

        await importCSVServices(mockReq, "products.csv");

        expect(createProductVariantsByCSV).toHaveBeenCalledWith(
            {
                size_name: "Standard",
                color: "Default",
                stock: 0,
            },
            200,
            "mockTransaction"
        );
    });

});
