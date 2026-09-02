import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

import {
  deleteProductVariantService,
} from ".../../../src/modules/productVariants/productVariants.services.js";

import {
  deleteProductVariant,
} from ".../../../src/modules/productVariants/productVariants.repository.js";

vi.mock(
  ".../../../src/modules/productVariants/productVariants.repository.js",
  () => ({
    deleteProductVariant: vi.fn(),
  })
);

describe("deleteProductVariantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete product variant successfully", async () => {
    const req = {
      params: {
        productId: "1",
        variantId: "10",
      },
    };

    vi.mocked(deleteProductVariant).mockResolvedValue(
      { count: 1 }
    );

    await expect(
      deleteProductVariantService(req)
    ).resolves.toBeUndefined();

    expect(deleteProductVariant).toHaveBeenCalledWith(
      1,
      10
    );
  });

  it("should throw 400 when product ID is invalid", async () => {
    const invalidProductIds = [
      "abc",
      "0",
      "-1",
      "1.5",
    ];

    for (const productId of invalidProductIds) {
      const req = {
        params: {
          productId,
          variantId: "10",
        },
      };

      await expect(
        deleteProductVariantService(req)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product or variant ID",
      });
    }

    expect(deleteProductVariant).not.toHaveBeenCalled();
  });

  it("should throw 400 when variant ID is invalid", async () => {
    const invalidVariantIds = [
      "abc",
      "0",
      "-1",
      "1.5",
    ];

    for (const variantId of invalidVariantIds) {
      const req = {
        params: {
          productId: "1",
          variantId,
        },
      };

      await expect(
        deleteProductVariantService(req)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product or variant ID",
      });
    }

    expect(deleteProductVariant).not.toHaveBeenCalled();
  });

  it("should throw 400 when both IDs are invalid", async () => {
    const req = {
      params: {
        productId: "abc",
        variantId: "xyz",
      },
    };

    await expect(
      deleteProductVariantService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product or variant ID",
    });

    expect(deleteProductVariant).not.toHaveBeenCalled();
  });

  it("should throw 500 when repository fails", async () => {
    const req = {
      params: {
        productId: "1",
        variantId: "10",
      },
    };

    vi.mocked(deleteProductVariant).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      deleteProductVariantService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to delete product variant",
    });

    expect(deleteProductVariant).toHaveBeenCalledWith(
      1,
      10
    );
  });
});