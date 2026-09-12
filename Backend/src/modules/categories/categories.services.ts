import { Request } from "express";
import { prisma } from "../../config/database.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { deleteCategory, getCategories, getCategoryByName, insertCategory, updateCategory } from "./categories.repository.js";

export const insertCategoriesService = async (categoryName:string,tx:any = prisma):Promise<number> => {
    let categoryId;

    //get existing category of same name
    const existingCategory = await getCategoryByName(categoryName,tx)

    if (existingCategory.length > 0) {

        categoryId = existingCategory[0]?.id;

    } else {

        const slug = categoryName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-");

        //insert category
        const category = await insertCategory(categoryName, slug, tx)

        categoryId = category?.id;
    }

    return categoryId as number;
}

export const getCategoryService = async () => {
    try {
        const categories = await getCategories();
        return categories;
    } catch (error) {
        throw new ApiError(500, `Failed to fetch categories: ${getErrorMessage(error)}`);
    }
}

export const createCategoryService = async (req:any) => {
    const { name } = req;

    const categoryId = await insertCategoriesService(name);
    return categoryId;
}

export const updateCategoryService = async (req:Request) => {
    const { id } = req?.params;
    const { categoryName } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        throw new ApiError(400, "Invalid category ID");
    }

    const categoryId = Number(id)

    try {
        const slug = categoryName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");
        const updatedCategory = await updateCategory(categoryId,categoryName, slug)
        return updatedCategory;
    } catch (error) {
        throw new ApiError(500, "Failed to update the category.")
    }
}

export const deleteCategoryService = async (req:Request) => {
    const { id } = req.params

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        throw new ApiError(400, "Invalid category ID");
    }

    const categoryId = Number(id);

    try {
       const deletedCategory = await deleteCategory(categoryId);
       return deletedCategory;
    } catch (error) {
        throw new ApiError(500, "Failed to delete the category.")
    }

}