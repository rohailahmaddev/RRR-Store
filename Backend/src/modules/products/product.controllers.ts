import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { activateProductListingService, addProductService, deactivateProductListingService, getProductsService, getSingleProductService, updateProductService } from "./product.services.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";

export const addProductController = asyncHandler(async (req: Request, res: Response) => {
  const { productName, description, price, categoryName, sku } = req.body;
  let productVariants = req.body.productVariants;
  const files = (req.files as { images?: Express.Multer.File[] } | undefined)?.images ?? [];
  const imageLocalPaths = files?.map((file) => file.path) || [];
  const productId = await addProductService({ productName, description, price, categoryName, sku, productVariants, imageLocalPaths })

  return res
    .status(201)
    .json(new ApiResponse(201, "Product created successfully", { product_id: productId }))
})

export const updateProductListingController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    await updateProductService({
      productId: Number(id),
      body: req.body,
      files: req.files,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Product updated successfully"
        )
      );
  }
);

export const getProductsController = asyncHandler(async (req: Request, res: Response) => {


  const { products, totalProducts, page, limit } = await getProductsService(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, "Products fetched successfully", {
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit: Number(limit),
      },
    }))
})

export const getSingleProductController = asyncHandler(async (req: Request, res: Response) => {
  const product = await getSingleProductService(req);

  return res
  .status(200)
  .json(new ApiResponse(200, "Product fetched successfully", product))
})

export const deactivateProductListingController = asyncHandler(async (req: Request, res: Response) => {

  await deactivateProductListingService(req);

  return res
  .status(200)
  .json(new ApiResponse(200, "Product listing is deactivated successfully"));

})

export const activateProductListingController = asyncHandler(async (req: Request, res: Response) => {

  await activateProductListingService(req);

  return res
  .status(200)
  .json(new ApiResponse(200, "Product listing is activated successfully"));

})