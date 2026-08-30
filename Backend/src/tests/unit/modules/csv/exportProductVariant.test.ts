import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportProductVariantsCSVServices, } from "../../../../modules/csv/csv.services.js";
import { ApiError } from "../../../../shared/utility/ApiError.js";
import { exportProductVariantsCSV } from "../../../../modules/csv/csv.repository.js";
import { auditLogs } from "../../../../modules/logs/logs.services.js";

vi.mock("../../../../modules/csv/csv.repository.js", () => ({
    exportCSVData: vi.fn(),
    exportProductVariantsCSV: vi.fn(),
}));

vi.mock("../../../../modules/logs/logs.services.js", () => ({
    auditLogs: vi.fn(),
}));

vi.mock("../../../../config/database.js", () => ({
    prisma: {
        $transaction: vi.fn(),
    },
}));

vi.mock("csv-parser", () => ({
    default: vi.fn(() => ({
        on: vi.fn(),
    })),
}));

vi.mock("json2csv", () => ({
    Parser: class {
        fields: string[];

        constructor({ fields }: { fields: string[] }) {
            this.fields = fields;
        }

        parse(data: any[]) {
            return [
                this.fields.join(","),
                ...data.map((row) =>
                    this.fields
                        .map((field) => row[field] ?? "")
                        .join(",")
                ),
            ].join("\n");
        }
    },
}));

describe("exportProductVariantsCSVServices", () => {

    const mockReq = {
        user: {
            id: 1,
        },
        ip: "127.0.0.1",
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should export product variants as CSV", async () => {
        const variants = [
            {
                id: 1,
                name: "T-Shirt",
                sku: "TS001",
                price: 1000,
                rating: 4,
                rating_count: 20,
                category_name: "Clothes",
                is_active: true,
                size_name: "Large",
                color: "Black",
                stock: 10,
            },
        ];

        vi.mocked(exportProductVariantsCSV).mockResolvedValue(variants);

        const result = await exportProductVariantsCSVServices(mockReq);

        expect(exportProductVariantsCSV).toHaveBeenCalledTimes(1);

        expect(result).toContain("id,name,sku");
        expect(result).toContain("Large");
        expect(result).toContain("Black");

        expect(auditLogs).toHaveBeenCalledWith({
            userId: 1,
            action: "EXPORT_PRODUCT_VARIANTS_CSV",
            entityType: "CSV",
            entityId: null,
            details: {
                export_csv: "Export products variants csv",
            },
            ipAddress: "127.0.0.1",
        });
    });

    it("should throw error when no variants exist", async () => {
        vi.mocked(exportProductVariantsCSV).mockResolvedValue([]);

        await expect(
            exportProductVariantsCSVServices(mockReq)
        ).rejects.toThrow("No products found to export.");

        expect(auditLogs).not.toHaveBeenCalled();
    });

    it("should throw ApiError when variant export fails", async () => {
        vi.mocked(exportProductVariantsCSV).mockRejectedValue(
            new Error("Database error")
        );

        await expect(
            exportProductVariantsCSVServices(mockReq)
        ).rejects.toThrow(ApiError);
    });

});
