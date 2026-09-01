import { beforeEach, describe, expect, it, vi, } from "vitest";
import { getProductById, updateProduct, } from "../../../../../modules/products/product.repository.js";
import { auditLogs } from "../../../../../modules/logs/logs.services.js";
import { activateProductListingService, } from "../../../../../modules/products/product.services.js";

vi.mock(
  "../../../../../modules/products/product.repository.js",
  () => ({
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  })
);

vi.mock(
  "../../../../../modules/logs/logs.services.js",
  () => ({
    auditLogs: vi.fn(),
  })
);


describe("activateProductListingService", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });


  it("should activate an inactive product successfully", async () => {

    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      is_active: false,
    } as any);

    vi.mocked(updateProduct).mockResolvedValue(
      undefined as any
    );

    vi.mocked(auditLogs).mockResolvedValue(
      undefined as any
    );


    const req = {
      params: {
        id: "1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await activateProductListingService(req);


    expect(getProductById)
      .toHaveBeenCalledWith(1);


    expect(updateProduct)
      .toHaveBeenCalledWith(
        1,
        {
          is_active: true,
        },
        expect.anything()
      );


    expect(auditLogs)
      .toHaveBeenCalledWith({
        userId: 10,

        action: "ACTIVATE_PRODUCT_LISTING",

        entityType: "product",

        entityId: 1,

        details: {
          field: "is_active",
          oldValue: false,
          newValue: true,
        },

        ipAddress: "127.0.0.1",
      });
  });


  it("should reject invalid product ID", async () => {

    const req = {
      params: {
        id: "abc",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });


    expect(getProductById)
      .not.toHaveBeenCalled();

    expect(updateProduct)
      .not.toHaveBeenCalled();
  });


  it("should reject zero product ID", async () => {

    const req = {
      params: {
        id: "0",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });
  });


  it("should reject negative product ID", async () => {

    const req = {
      params: {
        id: "-1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });
  });


  it("should return 404 when product does not exist", async () => {

    vi.mocked(getProductById)
      .mockResolvedValue(null as any);


    const req = {
      params: {
        id: "999999",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });


    expect(updateProduct)
      .not.toHaveBeenCalled();

    expect(auditLogs)
      .not.toHaveBeenCalled();
  });


  it("should reject an already activated product", async () => {

    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      is_active: true,
    } as any);


    const req = {
      params: {
        id: "1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Product is already activated",
    });


    expect(updateProduct)
      .not.toHaveBeenCalled();

    expect(auditLogs)
      .not.toHaveBeenCalled();
  });


  it("should return 500 when getProductById fails", async () => {

    vi.mocked(getProductById)
      .mockRejectedValue(
        new Error("Database error")
      );


    const req = {
      params: {
        id: "1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
    });


    expect(updateProduct)
      .not.toHaveBeenCalled();
  });


  it("should return 500 when updateProduct fails", async () => {

    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      is_active: false,
    } as any);


    vi.mocked(updateProduct)
      .mockRejectedValue(
        new Error("Database update failed")
      );


    const req = {
      params: {
        id: "1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
    });


    expect(auditLogs)
      .not.toHaveBeenCalled();
  });


  it("should return 500 when auditLogs fails", async () => {

    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      is_active: false,
    } as any);


    vi.mocked(updateProduct).mockResolvedValue(
      undefined as any
    );


    vi.mocked(auditLogs)
      .mockRejectedValue(
        new Error("Audit log failed")
      );


    const req = {
      params: {
        id: "1",
      },

      user: {
        id: 10,
      },

      ip: "127.0.0.1",
    };


    await expect(
      activateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
    });
  });

});