import { Request } from "express";
import { ApiError } from "../../shared/utility/ApiError.js";
import { getErrorMessage } from "../../shared/utility/tryCatchError.js";
import { validateProductSizeService } from "../productVariants/productVariants.services.js";
import { createCart, deleteCartItem, findCart, getCartItemForUpdate, getCartItems, insertItems } from "./cart.repository.js";
import { calculateQuantity, calculateSubTotal } from "../../shared/utility/helper.js";

export const findOrCreateCartService = async (userId: number) => {
    try {
        const cart = await findCart(userId);

        if (!cart) {
            const createdCart = await createCart(userId)

            if (!createdCart?.id) {
                throw new ApiError(500, `Failed to create cart.`)
            }

            return createdCart?.id;
        }

    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, `Internal server error. ${getErrorMessage(error)}`)
    }
}

export const createCartService = async (req: Request) => {
    const userId = Number(req?.user?.id);
    const { productId, productVariantId, color, quantity = 1 } = req.body;

    await validateProductSizeService({ productId, productVariantId, color, quantity })
    const cart_id = await findOrCreateCartService(userId)
    const cartId = Number(cart_id)

    try {
        const insertedItem = await insertItems({ productId, productVariantId, quantity, cartId })

        return insertedItem;
    } catch (error) {
        throw new ApiError(500, `Internal server error ${getErrorMessage(error)}`)
    }

}

export const getCartItemsService = async (req: Request) => {
    const userId = Number(req.user?.id);

    try {
        const cart = await findCart(userId);
        if (!cart) {
            return null;
        }

        const cartId = cart?.id;

        const cartItems = await getCartItems(cartId);

        if (Array.isArray(cartItems) && cartItems.length === 0) {
            return null;
        }

        const subTotal = calculateSubTotal(cartItems as Parameters<typeof calculateSubTotal>[0]);
        const totalItems = calculateQuantity(cartItems as Parameters<typeof calculateQuantity>[0]);


        return { cartItems, subTotal, totalItems }


    } catch (error) {
        throw new ApiError(500, `Internal server error. ${getErrorMessage(error)}`)
    }
}

export const removeCartItemsService = async ( req:Request) => {
    const userId = Number(req.user?.id);
    const id = req?.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        throw new ApiError(400, "Invalid ID");
    }

    const cartItemId = Number(id)

    try {
        const cart = await findCart(userId);
        
        if(!cart){
            throw new ApiError(404, "Cart not found");
        }

        const cartId = cart?.id;
        const deletedItem = await deleteCartItem(cartItemId, cartId);

        return deletedItem;

    } catch (error) {
        if(error instanceof ApiError){
           throw error
        }

        throw new ApiError(500, `Internal server error. ${getErrorMessage(error)}`)
    }

}

export const updateCartQuantity = async (req:Request) => {
    const userId = Number(req.user?.id);
    const { id } = req.params;
    const { operation } = req.body;

    
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        throw new ApiError(400, "Invalid ID");
    }
    
    const cartItemId = Number(id);

    try {

        const items = await getCartItemForUpdate(cartItemId, userId);

        if(Array.isArray(items) && items.length ===0 ) {
            throw new ApiError(404, "Item not found.");
        }

        

    } catch (error) {
        
    }
}