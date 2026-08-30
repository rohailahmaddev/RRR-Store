import { describe, it, expect, vi, beforeEach, } from "vitest";
import { exportCSVController, exportProductVariantCSVController, importProductVariantCSVController, } from "../../../../modules/csv/csv.controllers.js";
import { exportCSVServices, exportProductVariantsCSVServices, importCSVServices, } from "../../../../modules/csv/csv.services.js";

vi.mock("../../../../modules/csv/csv.services.js", () => ({
  exportCSVServices: vi.fn(),
  exportProductVariantsCSVServices: vi.fn(),
  importCSVServices: vi.fn(),
}));

//export simple product csv
describe("exportCSVController", () => {
  it("should return CSV file", async () => {
    vi.mocked(exportCSVServices).mockResolvedValue(
      "id,name,sku\n1,T-Shirt,TS001"
    );

    const req = {} as any;

    const res = {
      header: vi.fn().mockReturnThis(),
      attachment: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    await exportCSVController(req, res, vi.fn());

    expect(exportCSVServices).toHaveBeenCalledWith(req);

    expect(res.header).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv"
    );

    expect(res.attachment).toHaveBeenCalledWith(
      expect.stringMatching(
        /^products-export-\d+\.csv$/
      )
    );

    expect(res.send).toHaveBeenCalledWith(
      "id,name,sku\n1,T-Shirt,TS001"
    );
  });
});

//export product variant controller csv
describe("exportProductVariantCSVController", () => {
  it("should return product variant CSV", async () => {
    vi.mocked(
      exportProductVariantsCSVServices
    ).mockResolvedValue(
      "id,name,sku,size_name,color,stock\n1,T-Shirt,TS001,L,Black,10"
    );

    const req = {} as any;

    const res = {
      header: vi.fn().mockReturnThis(),
      attachment: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any;

    await exportProductVariantCSVController(
      req,
      res,
      vi.fn()
    );

    expect(
      exportProductVariantsCSVServices
    ).toHaveBeenCalledWith(req);

    expect(res.header).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv"
    );

    expect(res.attachment).toHaveBeenCalledWith(
      expect.stringMatching(
        /^product-variants-\d+\.csv$/
      )
    );

    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("T-Shirt")
    );
  });
});

//import controller
describe("importProductVariantCSVController", () => {
  it("should import CSV and return success response", async () => {
    const req = {
      file: {
        path: "uploads/products.csv",
      },
    } as any;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    vi.mocked(importCSVServices).mockResolvedValue(
      undefined
    );

    await importProductVariantCSVController(
      req,
      res,
      vi.fn()
    );

    expect(importCSVServices).toHaveBeenCalledWith(
      req,
      "uploads/products.csv"
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 200,
        message:
          "All products imported successfully from CSV file",
      })
    );
  });
});