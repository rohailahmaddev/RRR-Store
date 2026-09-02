import { ApiError } from "../../shared/utility/ApiError.js";
import { validateVariantsArray } from "../../shared/utility/helper.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { createProductVariants, deleteProductVariant, getProductVariantsByProductId, updateProductVariants } from "./productVariants.repository.js";

export const addProductVariantsService = async (req:any) => {
    const {id} = req.params;
    const productVariants  = req.body.productVariants;

    if(!Number.isInteger(Number(id)) || Number(id) <= 0){
        throw new ApiError(400, "Invalid product ID");
    }

    if (!Array.isArray(productVariants)) {
      throw new ApiError(
        400,
        "productVariants must be an array"
      );
    }

    const productId = Number(id);

    try {
        const validProductVariants = validateVariantsArray(productVariants);
        await createProductVariants(productId,validProductVariants);
    } catch (error) {
        throw new ApiError(500, `Failed to add product variant ${getErrorMessage(error)}`);  
    }
}

export const updateProductVariantsService = async (req:any) => {
  const {id} = req.params;
  if(!Number.isInteger(Number(id)) || Number(id) <= 0){
    throw new ApiError(400, "Invalid product ID");
  }
  const hasProductVariants = req?.body?.productVariants !== undefined;
  let productVariants: any[] = [];
  if (hasProductVariants) {
    productVariants = req?.body?.productVariants;
    if (!Array.isArray(productVariants)) {
      throw new ApiError(
        400,
        "productVariants must be an array"
      );
    }
  } 

  const productId = Number(id)

  try {
    if (hasProductVariants) {
        const validatedVariants = validateVariantsArray(productVariants);
        await updateProductVariants(productId, validatedVariants);
    }
  } catch (error) {
    throw new ApiError(500, `Failed to update product variant: ${getErrorMessage(error)}`);
  }

}

export const deleteProductVariantService = async (req:any) => {
  const {productId,variantId} = req.params;
  if(!Number.isInteger(Number(productId)) || Number(productId) <= 0 || !Number.isInteger(Number(variantId)) || Number(variantId) <= 0){
    throw new ApiError(400, "Invalid product or variant ID");  
  }

  const pId = Number(productId);
  const vId = Number(variantId);

  try {
    const result = await deleteProductVariant(pId, vId);
    if (result?.count === 0) {
      throw new ApiError(404, "Variant not found for this product");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to delete product variant: ${getErrorMessage(error)}`);
  }
}

export const getProductVariantsService = async (req:any) => {
  const {id} = req.params;
    if(!Number.isInteger(Number(id)) || Number(id) <= 0){   
        throw new ApiError(400, "Invalid product ID");
    }

    const productId = Number(id);   
    try {
        const productVariants = await getProductVariantsByProductId(productId);
        if(productVariants.length===0){
          throw new ApiError(404, "No variants found for this product");
        }
        return productVariants;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to fetch product variants");
    }
}