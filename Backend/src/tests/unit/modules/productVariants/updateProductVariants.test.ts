import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

import {
  updateProductVariantsService,
} from ".../../../src/modules/productVariants/productVariants.services.js";

import {
  updateProductVariants,
} from ".../../../src/modules/productVariants/productVariants.repository.js";

import {
  validateVariantsArray,
} from "../../../../shared/utility/helper.js";

vi.mock(
  ".../../../src/modules/productVariants/productVariants.repository.js",
  () => ({
    updateProductVariants: vi.fn(),
  })
);

vi.mock(
  "../../../../shared/utility/helper.js",
  () => ({
    validateVariantsArray: vi.fn(),
  })
);

describe("updateProductVariantsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update product variants successfully", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: [
          {
            size_name: "M",
            color: "Black",
            stock: 20,
          },
          {
            size_name: "L",
            color: "Black",
            stock: 15,
          },
        ],
      },
    };

    const validatedVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 20,
      },
      {
        size_name: "L",
        color: "Black",
        stock: 15,
      },
    ];

    vi.mocked(validateVariantsArray).mockReturnValue(
      validatedVariants
    );

    vi.mocked(updateProductVariants).mockResolvedValue(
      undefined
    );

    await expect(
      updateProductVariantsService(req)
    ).resolves.toBeUndefined();

    expect(validateVariantsArray).toHaveBeenCalledWith(
      req.body.productVariants
    );

    expect(updateProductVariants).toHaveBeenCalledWith(
      1,
      validatedVariants
    );
  });

  it("should not update variants when productVariants is not provided", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {},
    };

    await expect(
      updateProductVariantsService(req)
    ).resolves.toBeUndefined();

    expect(validateVariantsArray).not.toHaveBeenCalled();

    expect(updateProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 400 when productVariants is not an array", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: "invalid",
      },
    };

    await expect(
      updateProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "productVariants must be an array",
    });

    expect(validateVariantsArray).not.toHaveBeenCalled();

    expect(updateProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 500 when validateVariantsArray fails", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: [
          {
            size_name: "M",
            color: "Black",
            stock: 20,
          },
        ],
      },
    };

    vi.mocked(validateVariantsArray).mockImplementation(() => {
      throw new Error("Invalid variant data");
    });

    await expect(
      updateProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to update product variant",
    });

    expect(updateProductVariants).not.toHaveBeenCalled();
  });

  it("should throw 500 when updateProductVariants fails", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: [
          {
            size_name: "M",
            color: "Black",
            stock: 20,
          },
        ],
      },
    };

    const validatedVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 20,
      },
    ];

    vi.mocked(validateVariantsArray).mockReturnValue(
      validatedVariants
    );

    vi.mocked(updateProductVariants).mockRejectedValue(
      new Error("Database error")
    );

    await expect(
      updateProductVariantsService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to update product variant",
    });

    expect(validateVariantsArray).toHaveBeenCalledWith(
      req.body.productVariants
    );

    expect(updateProductVariants).toHaveBeenCalledWith(
      1,
      validatedVariants
    );
  });

  it("should not call repository when productVariants is an empty array", async () => {
    const req = {
      params: {
        id: "1",
      },
      body: {
        productVariants: [],
      },
    };

    vi.mocked(validateVariantsArray).mockReturnValue([]);

    vi.mocked(updateProductVariants).mockResolvedValue(
      undefined
    );

    await expect(
      updateProductVariantsService(req)
    ).resolves.toBeUndefined();

    expect(validateVariantsArray).toHaveBeenCalledWith([]);

    expect(updateProductVariants).toHaveBeenCalledWith(
      1,
      []
    );
  });
});