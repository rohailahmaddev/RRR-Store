import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProductVariantsService } from "../../../../modules/productVariants/productVariants.services.js";
import { getProductVariantsByProductId } from "../../../../modules/productVariants/productVariants.repository.js";
import { ApiError } from "../../../../shared/utility/ApiError.js";

vi.mock(
  "../../../../modules/productVariants/productVariants.repository.js",
  () => ({
    getProductVariantsByProductId: vi.fn(),
  })
);

describe("getProductVariantsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────
  // SUCCESS
  // ─────────────────────────────────────

  it("should return product variants successfully", async () => {
    const mockVariants = [
      {
        id: 1,
        product_id: 10,
        size_name: "M",
        color: "Black",
        stock: 10,
      },
      {
        id: 2,
        product_id: 10,
        size_name: "L",
        color: "Black",
        stock: 5,
      },
    ];

    vi.mocked(getProductVariantsByProductId).mockResolvedValue(
      mockVariants as any
    );

    const req = {
      params: {
        id: "10",
      },
    };

    const result = await getProductVariantsService(req);

    expect(result).toEqual(mockVariants);

    expect(getProductVariantsByProductId).toHaveBeenCalledTimes(1);
    expect(getProductVariantsByProductId).toHaveBeenCalledWith(10);
  });

  // ─────────────────────────────────────
  // INVALID PRODUCT ID
  // ─────────────────────────────────────

  it.each([
    ["abc", "string"],
    ["0", "zero"],
    ["-1", "negative"],
    ["1.5", "decimal"],
    ["", "empty"],
  ])(
    "should throw 400 for invalid product ID: %s (%s)",
    async (id) => {
      const req = {
        params: {
          id,
        },
      };

      await expect(
        getProductVariantsService(req)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product ID",
      });

      expect(getProductVariantsByProductId).not.toHaveBeenCalled();
    }
  );

  // ─────────────────────────────────────
  // EMPTY RESULT
  // ─────────────────────────────────────

  it("should return empty array when product has no variants", async () => {
    vi.mocked(getProductVariantsByProductId).mockResolvedValue([]);

    const req = {
      params: {
        id: "10",
      },
    };

    const result = await getProductVariantsService(req);

    expect(result).toEqual([]);

    expect(getProductVariantsByProductId).toHaveBeenCalledWith(10);
  });

  // ─────────────────────────────────────
  // REPOSITORY ERROR
  // ─────────────────────────────────────

  it("should throw 500 when repository fails", async () => {
    vi.mocked(getProductVariantsByProductId).mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = {
      params: {
        id: "10",
      },
    };

    await expect(
      getProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch product variants",
    });

    expect(getProductVariantsByProductId).toHaveBeenCalledWith(10);
  });
});