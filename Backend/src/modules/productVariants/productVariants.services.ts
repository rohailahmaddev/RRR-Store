import { ApiError } from "../../shared/utility/ApiError.js";
import { validateVariantsArray } from "../../shared/utility/helper.js";
import { createProductVariants, deleteProductVariant, getProductVariantsByProductId, updateProductVariants } from "./productVariants.repository.js";

export const addProductVariantsService = async (req:any) => {
    const {id} = req.params;
    const {productVariants} = req.body.productVariants;

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
        throw new ApiError(500, "Failed to add product variant");  
    }
}

export const updateProductVariantsService = async (req:any) => {
  const {id} = req.params;
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
    throw new ApiError(500, "Failed to update product variant");
  }

}

export const deleteProductVariantService = async (req:any) => {
  const {id,vId} = req.params;
  if(!Number.isInteger(Number(id)) || Number(id) <= 0 || !Number.isInteger(Number(vId)) || Number(vId) <= 0){
    throw new ApiError(400, "Invalid product or variant ID");  
  }

  const productId = Number(id);
  const variantId = Number(vId);

  try {
    await deleteProductVariant(productId, variantId);
  } catch (error) {
    throw new ApiError(500, "Failed to delete product variant");
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
        return productVariants;
    } catch (error) {
        throw new ApiError(500, "Failed to fetch product variants");
    }
}