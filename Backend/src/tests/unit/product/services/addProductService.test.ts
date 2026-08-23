import { addProductService, uploadImagesOnCloudinaryService, insertCategoriesService, } from "../../../../modules/products/product.services.js";
import { prisma } from "../../../../config/database.js";
import { getCategoryByName, createProduct, createProductImages, createProductVariants, insertCategory } from "../../../../modules/products/product.repository.js";
import { deleteFromCloudinary } from "../../../../infrastructure/storage/cloudinary.storage.js";
import { uploadImagesOnCloudinary, validateVariantsArray } from "../../../../shared/utility/helper.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../config/database.js", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../../modules/products/product.repository.js", () => ({
  getCategoryByName: vi.fn(),
  insertCategory: vi.fn(),
  createProduct: vi.fn(),
  createProductImages: vi.fn(),
  createProductVariants: vi.fn(),
}));

vi.mock("../../../../shared/utility/helper.js", () => ({
  validateVariantsArray: vi.fn(),
  uploadImagesOnCloudinary:vi.fn(),

}));

vi.mock("../../../../infrastructure/storage/cloudinary.storage.js",()=>({
    deleteFromCloudinary: vi.fn(),
}))

describe("addProductService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create product successfully", async () => {
    const uploadedImages = [
      {
        public_id: "products/image1",
        secure_url: "https://cloudinary.com/image1.jpg",
      },
    ];

    const validVariants = [
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ];

    vi.mocked(uploadImagesOnCloudinary).mockResolvedValue([
    {
    public_id: "products/image1",
    secure_url: "https://cloudinary.com/image1.jpg",
     },
    ] as any);

    vi.mocked(getCategoryByName).mockResolvedValue([]);
    vi.mocked(insertCategory).mockResolvedValue({
      id: 10,
      name: "shoes",
      slug: "SH-097-OE",
    } as any);;

    vi.mocked(createProduct).mockResolvedValue({
      id: 100,
    } as any);

    vi.mocked(validateVariantsArray).mockReturnValue(
      validVariants as any
    );

    vi.mocked(createProductImages).mockResolvedValue(
      undefined
    );

    vi.mocked(createProductVariants).mockResolvedValue(
      undefined
    );

    vi.mocked(prisma.$transaction).mockImplementation(
      async (callback: any) => {
        const tx = {};

        return await callback(tx);
      }
    );

    const result = await addProductService({
      productName: "Nike Shoes",
      description: "Running shoes",
      price: 5000.00,
      categoryName: "Shoes",
      sku: "NIKE-001",
      productVariants: [
        {
          size_name: "M",
          color: "Black",
          stock: 10,
        },
      ],
      imageLocalPaths: [
        "uploads/image1.jpg",
      ],
    });

    expect(result).toBe(100);

    // Cloudinary
    expect(uploadImagesOnCloudinary).toHaveBeenCalledWith([
      "uploads/image1.jpg",
    ]);

    // Category lookup
    expect(getCategoryByName).toHaveBeenCalledWith(
      "Shoes",
      expect.anything()
    );

    // Category creation
    expect(insertCategory).toHaveBeenCalledWith(
      "Shoes",
      "shoes",
      expect.anything()
    );

    expect(createProduct).toHaveBeenCalledWith({
      productName: "Nike Shoes",
      description: "Running shoes",
      price: 5000,
      categoryId: 10,
      sku: "NIKE-001",
      tx: expect.anything(),
    });

    expect(createProductImages).toHaveBeenCalledWith(
      100,
      uploadedImages,
      expect.anything()
    );

    expect(validateVariantsArray).toHaveBeenCalledWith([
      {
        size_name: "M",
        color: "Black",
        stock: 10,
      },
    ]);

    expect(createProductVariants).toHaveBeenCalledWith(
      100,
      validVariants,
      expect.anything()
    );
  });
});