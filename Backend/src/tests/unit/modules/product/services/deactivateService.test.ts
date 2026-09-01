import { beforeEach, describe, expect, it, vi, } from "vitest";
import { deactivateProductListingService, } from "../../../../../modules/products/product.services.js";
import { getProductById, updateProduct, } from "../../../../../modules/products/product.repository.js";
import { auditLogs } from "../../../../../modules/logs/logs.services.js";
import { prisma } from "../../../../../config/database.js";

vi.mock( "../../../../../modules/products/product.repository.js", () => ({
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  })
);

vi.mock( "../../../../../modules/logs/logs.services.js", () => ({
    auditLogs: vi.fn(),
  })
);

describe("deactivateProductListingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (id = "1") => ({
    params: {
      id,
    },
    user: {
      id: 10,
    },
    ip: "127.0.0.1",
  });

  it("should deactivate an active product successfully", async () => {
    const product = {
      id: 1,
      name: "iPhone 15",
      is_active: true,
    };

    vi.mocked(getProductById).mockResolvedValue(
      product as any
    );

    vi.mocked(updateProduct).mockResolvedValue(
      undefined as any
    );

    vi.mocked(auditLogs).mockResolvedValue(
      undefined as any
    );

    const req = createRequest("1");

    await expect(
      deactivateProductListingService(req)
    ).resolves.toBeUndefined();

    expect(getProductById).toHaveBeenCalledTimes(1);

    expect(getProductById).toHaveBeenCalledWith(1);

    expect(updateProduct).toHaveBeenCalledTimes(1);

    expect(updateProduct).toHaveBeenCalledWith(
      1,
      {
        is_active: false,
      },
       expect.anything()
    );

    expect(auditLogs).toHaveBeenCalledTimes(1);

    expect(auditLogs).toHaveBeenCalledWith({
      userId: 10,
      action: "DEACTIVATE_PRODUCT_LISTING",
      entityType: "product",
      entityId: 1,
      details: {
        field: "is_active",
        oldValue: true,
        newValue: false,
      },
      ipAddress: "127.0.0.1",
    });
  });

  it("should reject invalid product ID", async () => {
    const req = createRequest("abc");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(getProductById).not.toHaveBeenCalled();

    expect(updateProduct).not.toHaveBeenCalled();

    expect(auditLogs).not.toHaveBeenCalled();
  });

  it("should reject zero product ID", async () => {
    const req = createRequest("0");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(getProductById).not.toHaveBeenCalled();
  });

  it("should reject negative product ID", async () => {
    const req = createRequest("-1");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(getProductById).not.toHaveBeenCalled();
  });

  it("should reject decimal product ID", async () => {
    const req = createRequest("1.5");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(getProductById).not.toHaveBeenCalled();
  });

  it("should return 404 when product does not exist", async () => {
    vi.mocked(getProductById).mockResolvedValue(
      null
    );

    const req = createRequest("999");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });

    expect(updateProduct).not.toHaveBeenCalled();

    expect(auditLogs).not.toHaveBeenCalled();
  });

  it("should reject an already deactivated product", async () => {
    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      name: "iPhone 15",
      is_active: false,
    } as any);

    const req = createRequest("1");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Product is already deactivated",
    });

    expect(updateProduct).not.toHaveBeenCalled();

    expect(auditLogs).not.toHaveBeenCalled();
  });

  it("should throw 500 when updateProduct fails", async () => {
    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      name: "iPhone 15",
      is_active: true,
    } as any);

    vi.mocked(updateProduct).mockRejectedValue(
      new Error("Database update failed")
    );

    const req = createRequest("1");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining(
        "Failed to deactivate product"
      ),
    });

    expect(auditLogs).not.toHaveBeenCalled();
  });

  it("should throw 500 when auditLogs fails", async () => {
    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      name: "iPhone 15",
      is_active: true,
    } as any);

    vi.mocked(updateProduct).mockResolvedValue(
      undefined as any
    );

    vi.mocked(auditLogs).mockRejectedValue(
      new Error("Audit log failed")
    );

    const req = createRequest("1");

    await expect(
      deactivateProductListingService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining(
        "Failed to deactivate product"
      ),
    });

    expect(updateProduct).toHaveBeenCalled();
  });

  it("should pass the correct admin user ID to auditLogs", async () => {
    vi.mocked(getProductById).mockResolvedValue({
      id: 1,
      is_active: true,
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
        id: 55,
      },
      ip: "192.168.1.10",
    };

    await deactivateProductListingService(req);

    expect(auditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 55,
        entityId: 1,
        ipAddress: "192.168.1.10",
      })
    );
  });

});