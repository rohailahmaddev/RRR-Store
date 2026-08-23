import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadImagesOnCloudinaryService, } from "../../../../modules/products/product.services.js";
import { uploadImagesOnCloudinary } from "../../../../shared/utility/helper.js";

vi.mock("../../../../shared/utility/helper.js", () => ({
  uploadImagesOnCloudinary: vi.fn(),
}));

describe("uploadImagesOnCloudinaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upload images successfully", async () => {
    const images = [
      {
        public_id: "product/image1",
        secure_url: "https://cloudinary.com/image1.jpg",
      },
      {
        public_id: "product/image2",
        secure_url: "https://cloudinary.com/image2.jpg",
      },
    ];

    vi.mocked(uploadImagesOnCloudinary).mockResolvedValue(
      images as any
    );

    const result = await uploadImagesOnCloudinaryService([
      "uploads/image1.jpg",
      "uploads/image2.jpg",
    ]);

    expect(result).toEqual(images);

    expect(uploadImagesOnCloudinary).toHaveBeenCalledWith([
      "uploads/image1.jpg",
      "uploads/image2.jpg",
    ]);
  });

  it("should throw 504 when Cloudinary upload fails", async () => {
    vi.mocked(uploadImagesOnCloudinary).mockRejectedValue(
      new Error("Cloudinary error")
    );

    await expect(
      uploadImagesOnCloudinaryService([
        "uploads/image1.jpg",
      ])
    ).rejects.toMatchObject({
      statusCode: 504,
      message: "Failed to upload product images.",
    });
  });
});