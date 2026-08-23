import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { addProductService } from "./product.services.js";
import { parseJson } from "../../shared/utility/helper.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";

export const addProductController = asyncHandler(async(req:Request, res:Response) => {
    const { productName, description, price, categoryName, sku } = req.body;
    let productVariants = req.body.productVariants;
    const files = req.files as  Express.Multer.File[] | undefined;
    const imageLocalPaths = files?.map((file) => file.path) || [];
    const productId = await addProductService({ productName, description, price, categoryName, sku, productVariants, imageLocalPaths })
    
    return res
    .status(201)
    .json(new ApiResponse(201, "Product created successfully", { product_id:productId }))
})