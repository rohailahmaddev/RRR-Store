import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getSingleProductService } from "../../../../../modules/products/product.services.js";

import { getSingleProduct } from "../../../../../modules/products/product.repository.js";

vi.mock(
  "../../../../../modules/products/product.repository.js",
  () => ({
    getSingleProduct: vi.fn(),
  })
);

describe("getSingleProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return product when valid ID is provided", async () => {
    const product = [
      {
        id: 1,
        sku: "IPHONE-15",
        name: "iPhone 15",
        description: "Apple iPhone 15",
        price: 150000,
        rating: 4.5,
        rating_count: 100,
        category_name: "Mobile",
        category_id: 1,
      },
    ];

    vi.mocked(
      getSingleProduct
    ).mockResolvedValue(product as any);

    const req = {
      params: {
        id: "1",
      },
    };

    const result = await getSingleProductService(req);   

    expect(result).toEqual(product);

    expect(
      getSingleProduct
    ).toHaveBeenCalledTimes(1);

    expect(
      getSingleProduct
    ).toHaveBeenCalledWith(1);
  });

  it("should reject invalid product ID", async () => {
    const req = {
      params: {
        id: "abc",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(
      getSingleProduct
    ).not.toHaveBeenCalled();
  });

  it("should reject zero product ID", async () => {
    const req = {
      params: {
        id: "0",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(
      getSingleProduct
    ).not.toHaveBeenCalled();
  });

  it("should reject negative product ID", async () => {
    const req = {
      params: {
        id: "-5",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(
      getSingleProduct
    ).not.toHaveBeenCalled();
  });

  it("should reject decimal product ID", async () => {
    const req = {
      params: {
        id: "1.5",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid product ID",
    });

    expect(
      getSingleProduct
    ).not.toHaveBeenCalled();
  });

  it("should throw 404 when product does not exist", async () => {
    vi.mocked(
      getSingleProduct
    ).mockResolvedValue([]);

    const req = {
      params: {
        id: "999",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Product not found",
    });
  });

  it("should throw 500 when repository fails", async () => {
    vi.mocked(
      getSingleProduct
    ).mockRejectedValue(
      new Error("Database connection failed")
    );

    const req = {
      params: {
        id: "1",
      },
    };

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      statusCode: 500,
    });

    await expect(
      getSingleProductService(req)
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        "Failed to fetch product"
      ),
    });
  });

  it("should convert string ID to number", async () => {
    vi.mocked(
      getSingleProduct
    ).mockResolvedValue([
      {
        id: 25,
        name: "Laptop",
      },
    ] as any);

    const req = {
      params: {
        id: "25",
      },
    };

    await getSingleProductService(req);

    expect(
      getSingleProduct
    ).toHaveBeenCalledWith(25);
  });
});