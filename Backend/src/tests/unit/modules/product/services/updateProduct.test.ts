import { beforeEach, describe, expect, it, vi, } from "vitest";
import { updateProductService } from "../../../../../modules/products/product.services.js";
import { insertCategoriesService } from "../../../../../modules/categories/categories.services.js";
import {
    getProductById,
    getProductImagePublicIds,
    updateProduct,
    deleteProductImages,
    insertProductImages,
} from "../../../../../modules/products/product.repository.js";
import {
    uploadImagesOnCloudinaryService,
    deleteFromCloudinary,
} from "../../../../../infrastructure/storage/cloudinary.storage.js";
import { prisma } from "../../../../../config/database.js";
import { ApiError } from "../../../../../shared/utility/ApiError.js";

// --------------------------------------------------
// MOCK REPOSITORY
// --------------------------------------------------

vi.mock("../../../../../modules/products/product.repository.js", () => ({
    getProductById: vi.fn(),
    getProductImagePublicIds: vi.fn(),
    updateProduct: vi.fn(),
    deleteProductImages: vi.fn(),
    insertProductImages: vi.fn(),
})
);

// --------------------------------------------------
// MOCK SERVICE
// --------------------------------------------------

vi.mock("../../../../../modules/categories/categories.services.js", () => ({
    insertCategoriesService: vi.fn(),
}))

// --------------------------------------------------
// MOCK PRISMA
// --------------------------------------------------

vi.mock("../../../../../config/database.js", () => ({
    prisma: {
        $transaction: vi.fn(async (callback) => {
            const mockTx = {};
            return callback(mockTx);
        }),
    },
})
);


// --------------------------------------------------
// MOCK CLOUDINARY
// --------------------------------------------------

vi.mock("../../../../../infrastructure/storage/cloudinary.storage.js", () => ({
    uploadImagesOnCloudinaryService: vi.fn(),
    deleteFromCloudinary: vi.fn(),
})
);


// --------------------------------------------------
// MOCK VALIDATION
// --------------------------------------------------

vi.mock("../../../../../shared/utility/helper.js", () => ({
    validateVariantsArray: vi.fn((variants) => variants),
})
);


describe("updateProductService", () => {

    const mockTx = {};

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction)
            .mockImplementation(async (callback: any) => {
                return callback(mockTx);
            });
    });


    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    it("should update product successfully", async () => {

        vi.mocked(getProductById).mockResolvedValue({
            id: 1,
            name: "Old T-Shirt",
        } as any);

        vi.mocked(insertCategoriesService)
            .mockResolvedValue(5);

        vi.mocked(getProductImagePublicIds)
            .mockResolvedValue([]);

        vi.mocked(uploadImagesOnCloudinaryService)
            .mockResolvedValue([]);

        const body = {
            productName: "New T-Shirt",
            description: "Updated description",
            price: "1500",
            categoryName: "Clothes",
            sku: "TS001",
            productVariants: [
                {
                    size_name: "M",
                    color: "Black",
                    stock: 20,
                },
            ],
            deletedImageIds: [],
        };

        await updateProductService({
            productId: 1,
            body,
            files: {},
        });

        expect(getProductById)
            .toHaveBeenCalledWith(1);

        expect(insertCategoriesService)
            .toHaveBeenCalledWith(
                "Clothes",
                mockTx
            );

        expect(updateProduct)
            .toHaveBeenCalledWith(
                1,
                {
                    sku: "TS001",
                    name: "New T-Shirt",
                    description: "Updated description",
                    price: 1500,
                    categoryId: 5,
                },
                mockTx
            );

    });


    // --------------------------------------------------
    // PRODUCT NOT FOUND
    // --------------------------------------------------

    it("should throw 404 when product does not exist", async () => {

        vi.mocked(getProductById)
            .mockResolvedValue(null);

        await expect(
            updateProductService({
                productId: 999,
                body: {
                    productVariants: [],
                    deletedImageIds: [],
                },
                files: {},
            })
        ).rejects.toThrow("No product found");

        expect(prisma.$transaction)
            .not.toHaveBeenCalled();
    });


    // --------------------------------------------------
    // INVALID PRODUCT ID
    // --------------------------------------------------

    it("should reject invalid product id", async () => {

        await expect(
            updateProductService({
                productId: 0,
                body: {},
                files: {},
            })
        ).rejects.toThrow("Invalid product ID");

        expect(getProductById)
            .not.toHaveBeenCalled();
    });


    // --------------------------------------------------
    // INVALID PRICE
    // --------------------------------------------------

    it("should reject invalid price", async () => {

        await expect(
            updateProductService({
                productId: 1,
                body: {
                    price: "abc",
                },
                files: {},
            })
        ).rejects.toThrow(
            "Price must be a valid number"
        );

        expect(getProductById)
            .not.toHaveBeenCalled();
    });

    // --------------------------------------------------
    // INVALID DELETED IMAGES
    // --------------------------------------------------

    it("should reject deletedImageIds when it is not an array", async () => {

        await expect(
            updateProductService({
                productId: 1,
                body: {
                    deletedImageIds: "invalid",
                },
                files: {},
            })
        ).rejects.toThrow(
            "Deleted image must be an array"
        );
    });


    // --------------------------------------------------
    // IMAGE UPLOAD
    // --------------------------------------------------

    it("should upload new product images", async () => {

        vi.mocked(getProductById)
            .mockResolvedValue({
                id: 1,
            } as any);

        const uploadedImages = [
            {
                url: "https://cloudinary.com/image1.jpg",
                public_id: "image1",
            },
            {
                url: "https://cloudinary.com/image2.jpg",
                public_id: "image2",
            },
        ];

        vi.mocked(uploadImagesOnCloudinaryService)
            .mockResolvedValue(uploadedImages);

        const files = {
            images: [
                {
                    path: "public/temp/image1.jpg",
                },
                {
                    path: "public/temp/image2.jpg",
                },
            ],
        };

        await updateProductService({
            productId: 1,
            body: {},
            files,
        });

        expect(uploadImagesOnCloudinaryService)
            .toHaveBeenCalledWith([
                "public/temp/image1.jpg",
                "public/temp/image2.jpg",
            ]);

        expect(insertProductImages)
            .toHaveBeenCalledWith(
                1,
                uploadedImages,
                mockTx
            );
    });


    // --------------------------------------------------
    // DELETE IMAGES
    // --------------------------------------------------

    it("should delete selected product images", async () => {

        vi.mocked(getProductById)
            .mockResolvedValue({
                id: 1,
            } as any);

        vi.mocked(getProductImagePublicIds)
            .mockResolvedValue([
                {
                    public_id: "image123",
                },
            ]);

        await updateProductService({
            productId: 1,
            body: {
                deletedImageIds: [10],
            },
            files: {},
        });

        expect(getProductImagePublicIds)
            .toHaveBeenCalledWith(
                1,
                [10]
            );

        expect(deleteProductImages)
            .toHaveBeenCalledWith(
                1,
                [10],
                mockTx
            );

        expect(deleteFromCloudinary)
            .toHaveBeenCalledWith("image123");
    });


    // --------------------------------------------------
    // DATABASE FAILURE
    // --------------------------------------------------

    it("should delete uploaded images when database transaction fails", async () => {

        vi.mocked(getProductById)
            .mockResolvedValue({
                id: 1,
            } as any);

        const uploadedImages = [
            {
                url: "image.jpg",
                public_id: "image123",
            },
        ];

        vi.mocked(uploadImagesOnCloudinaryService)
            .mockResolvedValue(uploadedImages);

        vi.mocked(prisma.$transaction)
            .mockRejectedValue(
                new Error("Database error")
            );

        await expect(
            updateProductService({
                productId: 1,
                body: {},
                files: {
                    images: [
                        {
                            path: "/temp/image.jpg",
                        },
                    ],
                },
            })
        ).rejects.toThrow(
            "Failed to update product"
        );

        expect(deleteFromCloudinary)
            .toHaveBeenCalledWith(
                "image123"
            );
    });


    // --------------------------------------------------
    // CLOUDINARY FAILURE
    // --------------------------------------------------

    it("should throw 504 when image upload fails", async () => {

        vi.mocked(getProductById)
            .mockResolvedValue({
                id: 1,
            } as any);

        vi.mocked(uploadImagesOnCloudinaryService)
            .mockRejectedValue(new ApiError(504, "Failed to upload product images"));

        await expect(
            updateProductService({
                productId: 1,
                body: {},
                files: {
                    images: [
                        {
                            path: "/temp/image.jpg",
                        },
                    ],
                },
            })
        ).rejects.toThrow(
            "Failed to upload product images"
        );

        expect(prisma.$transaction)
            .not.toHaveBeenCalled();
    });

});