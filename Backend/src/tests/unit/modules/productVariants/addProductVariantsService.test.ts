import { describe, it, expect, vi, beforeEach } from "vitest";

import { addProductVariantsService } from "../../../../../src/modules/productVariants/productVariants.services.js";

import { createProductVariants } from "../../../../../src/modules/productVariants/productVariants.repository.js";

import { validateVariantsArray } from "../../../../shared/utility/helper.js";

vi.mock("../../../../../src/modules/productVariants/productVariants.repository.js", () => ({
  createProductVariants: vi.fn(),
}));

vi.mock("../../../../shared/utility/helper.js", () => ({
  validateVariantsArray: vi.fn(),
}));

describe("addProductVariantsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add product variants successfully", async () => {
    const req = {
      params: {
        id: "9",
      },
      body: {
        productVariants: {
          productVariants: [
            {
              size_name: "M",
              color: "Black",
              stock: 10,
            },
            {
              size_name: "L",
              color: "Black",
              stock: 5,
            },
          ],
        },
      },
    };

    const validProductVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
      {
        size_name: "L",
        color: "Black",
        stock: 5,
      },
    ];

    vi.mocked(validateVariantsArray).mockReturnValue(
      validProductVariants
    );

    vi.mocked(createProductVariants).mockResolvedValue(undefined);

    await expect(
      addProductVariantsService(req)
    ).resolves.toBeUndefined();

    expect(validateVariantsArray).toHaveBeenCalledWith(
      req.body.productVariants.productVariants
    );

    expect(createProductVariants).toHaveBeenCalledWith(
      1,
      validProductVariants
    );
  });

  it("should throw 400 for invalid product ID", async () => {
    const invalidIds = ["abc", "0", "-1", "1.5"];

    for (const id of invalidIds) {
      const req = {
        params: {
          id,
        },
        body: {
          productVariants: {
            productVariants: [],
          },
        },
      };

      await expect(
        addProductVariantsService(req)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid product ID",
      });
    }

    expect(validateVariantsArray).not.toHaveBeenCalled();
    expect(createProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 400 when productVariants is not an array", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: {
          productVariants: "invalid",
        },
      },
    };

    await expect(
      addProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "productVariants must be an array",
    });

    expect(validateVariantsArray).not.toHaveBeenCalled();
    expect(createProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 500 when validateVariantsArray fails", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: {
          productVariants: [
            {
              size_name: "M",
              color: "Black",
              stock: 10,
            },
          ],
        },
      },
    };

    vi.mocked(validateVariantsArray).mockImplementation(() => {
      throw new Error("Invalid variant data");
    });

    await expect(
      addProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to add product variant",
    });

    expect(createProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 500 when createProductVariants fails", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: {
          productVariants: [
            {
              size_name: "M",
              color: "Black",
              stock: 10,
            },
          ],
        },
      },
    };

    const validProductVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    vi.mocked(validateVariantsArray).mockReturnValue(
      validProductVariants
    );

    vi.mocked(createProductVariants).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      addProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to add product variant",
    });

    expect(validateVariantsArray).toHaveBeenCalledWith(
      req.body.productVariants.productVariants
    );

    expect(createProductVariants).toHaveBeenCalledWith(
      1,
      validProductVariants
    );
  });
});