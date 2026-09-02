import { describe, it, expect, vi, beforeEach } from "vitest";

import { getRelatedProductsService } from "../../../../../../src/modules/products/product.services.js";

import {
  getProductCategoryIdByProductId,
  getRelatedProducts,
} from "../../../../../../src/modules/products/product.repository.js";

import { ApiError } from ".../../../src/shared/utility/ApiError.js";

vi.mock("../../../../../../src/modules/products/product.repository.js", () => ({
  getProductCategoryIdByProductId: vi.fn(),
  getRelatedProducts: vi.fn(),
}));

describe("getRelatedProductsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return related products successfully", async () => {
    const req = {
      params: {
        id: "1",
      },
    };

    const product = {
      category_id: 10,
      name: "Nike Air Max",
    };

    const relatedProducts = [
      {
        id: 2,
        name: "Nike Revolution",
        category_id: 10,
      },
      {
        id: 3,
        name: "Nike Pegasus",
        category_id: 10,
      },
    ];

    vi.mocked(getProductCategoryIdByProductId).mockResolvedValue(product);

    vi.mocked(getRelatedProducts).mockResolvedValue(relatedProducts);

    const result = await getRelatedProductsService(req);

    expect(result).toEqual(relatedProducts);

    expect(getProductCategoryIdByProductId).toHaveBeenCalledWith(1);

    expect(getRelatedProducts).toHaveBeenCalledWith(
      10,
      1,
      "Nike Air Max"
    );
  });

  it("should throw 400 for invalid product ID", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5"];

    for (const id of invalidIds) {
      const req = {
        params: {
          id,
        },
      };

      await expect(
        getRelatedProductsService(req)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product ID",
      });
    }

    expect(getProductCategoryIdByProductId).not.toHaveBeenCalled();

    expect(getRelatedProducts).not.toHaveBeenCalled();
  });

  it("should throw 404 when product does not exist", async () => {
    const req = {
      params: {
        id: "999",
      },
    };

    vi.mocked(
      getProductCategoryIdByProductId
    ).mockResolvedValue(null);

    await expect(
      getRelatedProductsService(req)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });

    expect(
      getProductCategoryIdByProductId
    ).toHaveBeenCalledWith(999);

    expect(getRelatedProducts).not.toHaveBeenCalled();
  });

  it("should throw 500 when getProductCategoryIdByProductId fails", async () => {
    const req = {
      params: {
        id: "1",
      },
    };

    vi.mocked(
      getProductCategoryIdByProductId
    ).mockRejectedValue(new Error("Database connection failed"));

    await expect(
      getRelatedProductsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining(
        "Failed to fetch related products"
      ),
    });

    expect(getRelatedProducts).not.toHaveBeenCalled();
  });

  it("should throw 500 when getRelatedProducts fails", async () => {
    const req = {
      params: {
        id: "1",
      },
    };

    const product = {
      category_id: 10,
      name: "Nike Air Max",
    };

    vi.mocked(
      getProductCategoryIdByProductId
    ).mockResolvedValue(product);

    vi.mocked(getRelatedProducts).mockRejectedValue(
      new Error("Database query failed")
    );

    await expect(
      getRelatedProductsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining(
        "Failed to fetch related products"
      ),
    });
  });
});