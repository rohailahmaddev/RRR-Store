import { Request, Response } from "express";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { createCategoryService, deleteCategoryService, getCategoryService, updateCategoryService } from "./categories.services.js";

export const createCategoryController = asyncHandler (async (req, res) => {
    const categroryId = await createCategoryService(req.body);

    return res.status(201).json(
        new ApiResponse(
        201,
        "Category created successfully",
        categroryId
    ));
});

export const getCategoriesController = asyncHandler (async (req, res) => {

    const categories = await getCategoryService();

    return res
    .status(200)
    .json(new ApiResponse(200,"Category fetched successfully.", categories))

})

export const updateCategoryController = asyncHandler(async(req:Request, res:Response) =>{
    const updatedCategory = await updateCategoryService(req);

    return res
    .status(200)
    .json(new ApiResponse(200,"Category updated successfully.", updatedCategory))
})

export const deleteCategoryController = asyncHandler( async(req:Request, res:Response) => {
    const deletedCategory = await deleteCategoryService(req);

    return res
    .status(200)
    .json(new ApiResponse(200,"Category deleted successfully.", deletedCategory))
})