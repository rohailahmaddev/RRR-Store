import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { addProductVariantsService, deleteProductVariantService, getProductVariantsService, updateProductVariantsService } from "./productVariants.services.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";

export const addProductVariants = asyncHandler(async(req:Request, res:Response) => {
    await addProductVariantsService(req);
    return res.status(201).json(
        new ApiResponse(
            201, "Product variant added successfully",  
        )
    ); 
})

export const updateProductVariantsController = asyncHandler( async( req:Request, res:Response) => {
    await updateProductVariantsService(req);
    return res.status(200).json(
        new ApiResponse(
            200, "Product variant updated successfully",  
        )
    ); 
})

export const deleteProductVariantController = asyncHandler(async (req: Request, res: Response) => {
    await deleteProductVariantService(req);
    return res.status(200).json(
        new ApiResponse(
            200, "Product variant deleted successfully",
        )
    );
})

export const getProductVariantsController = asyncHandler(async (req: Request, res: Response) => {
    const productVariants = await getProductVariantsService(req);
    return res.status(200).json(
        new ApiResponse(
            200, "Product variants fetched successfully",
            productVariants 
        )
    );
})
