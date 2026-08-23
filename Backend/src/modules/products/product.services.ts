import { prisma } from "../../config/database.js";
import { TransactionClient } from "../../generated/prisma/internal/prismaNamespace.js";
import { deleteFromCloudinary } from "../../infrastructure/storage/cloudinary.storage.js";
import { uploadImagesList } from "../../shared/types/index.types.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { uploadImagesOnCloudinary, validateVariantsArray } from "../../shared/utility/helper.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { createProduct, createProductImages, createProductVariants, getCategoryByName, insertCategory } from "./product.repository.js";
import { addProduct } from "./product.types.js";

export const uploadImagesOnCloudinaryService = async(imagesLocalPaths:string[]):Promise<uploadImagesList> => {
    let uploadedImages:uploadImagesList;
    try {
        uploadedImages = await uploadImagesOnCloudinary(imagesLocalPaths)
    } catch (error) {
        throw new ApiError(504, `Failed to upload product images.${getErrorMessage(error)}`);
    }
    return uploadedImages;
}

export const insertCategoriesService = async (categoryName:string,tx:TransactionClient):Promise<number> => {
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

export const addProductService = async({ productName, description, price, categoryName, sku, productVariants, imageLocalPaths }:addProduct)=>{

    const uploadedImages = await uploadImagesOnCloudinaryService(imageLocalPaths);
    let productId
    try {

        await prisma.$transaction(async (tx) => {
            const categoryId = await insertCategoriesService(categoryName,tx);
            const product = await createProduct({productName,description,price,categoryId,sku,tx});
            productId = product?.id;
            await createProductImages(productId,uploadedImages,tx);
            const validProductVariants = validateVariantsArray(productVariants);
            await createProductVariants(productId,validProductVariants,tx);
        })     

    } catch (error) {
        
        //delete images form cloudinary after failure
        if (uploadedImages.length > 0) {
            await Promise.all(
                uploadedImages.map((img) => deleteFromCloudinary(img.public_id))
            )
        }

        throw new ApiError(500, `Failed to create product. ${getErrorMessage(error)}`);
    }

    return productId;  

}