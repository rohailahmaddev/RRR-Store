import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportCSVData, } from "../../../../modules/csv/csv.repository.js";
import { auditLogs } from "../../../../modules/logs/logs.services.js";
import { exportCSVServices } from "../../../../modules/csv/csv.services.js";
import { ApiError } from "../../../../shared/utility/ApiError.js";

vi.mock("../../../modules/csv/csv.repository.js", () => ({
  exportCSVData: vi.fn(),
}))

vi.mock("../../../modules/logs/logs.services.js", () => ({
  auditLogs: vi.fn(),
}));

vi.mock("../../../config/database.js", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
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

describe("exportCSVServices", () => {

  const mockReq = {
    user: {
      id: 1,
    },
    ip: "127.0.0.1",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export product data as CSV", async () => {
    const products = [
      {
        id: 1,
        name: "T-Shirt",
        sku: "TS001",
        description: "Cotton shirt",
        price: 1000,
        category_name: "Clothes",
        is_active: true,
        total_stock: 20,
      },
    ];

    vi.mocked(exportCSVData).mockResolvedValue(products);

    const result = await exportCSVServices(mockReq);

    expect(exportCSVData).toHaveBeenCalledTimes(1);

    expect(result).toContain("id,name,sku");
    expect(result).toContain("T-Shirt");

    expect(auditLogs).toHaveBeenCalledTimes(1);

    expect(auditLogs).toHaveBeenCalledWith({
      userId: 1,
      action: "EXPORT_SIMPLE_CSV",
      entityType: "CSV",
      entityId: null,
      details: {
        export_csv: "Export simple products csv",
      },
      ipAddress: "127.0.0.1",
    });
  });

  it("should throw error when no products exist", async () => {
    vi.mocked(exportCSVData).mockResolvedValue([]);

    await expect(
      exportCSVServices(mockReq)
    ).rejects.toThrow("No products found to export.");

    expect(auditLogs).not.toHaveBeenCalled();
  });

  it("should throw ApiError when exportCSVData fails", async () => {
    vi.mocked(exportCSVData).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      exportCSVServices(mockReq)
    ).rejects.toThrow(ApiError);

    expect(auditLogs).not.toHaveBeenCalled();
  });

});
