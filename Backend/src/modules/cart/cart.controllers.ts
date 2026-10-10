import { ApiError } from "../../shared/utility/ApiError.js";
import { ApiResponse } from "../../shared/utility/ApiResponse.js";
import { asyncHandler } from "../../shared/utility/asyncHandler.js";
import { createCartService, getCartItemsService, removeCartItemsService } from "./cart.services.js";

export const createCartContorller = asyncHandler(async (req, res) => {
    const insertedItem = await createCartService(req);

    return res
        .status(201)
        .json(new ApiResponse(201, "Item inserted successfully.", insertedItem))
})

export const getCartItemsController = asyncHandler(async (req, res) => {
    const result = await getCartItemsService(req);

    if (!result) {
        return res
            .status(200)
            .json(new ApiResponse(200, "Cart is empty", {
                items: [],
                subtotal: 0,
                totalItems: 0,
            })
            );
    }

    const { cartItems, subTotal, totalItems } = result;

    return res.status(200).json(
        new ApiResponse(200, "Cart items", {
            items: cartItems,
            subtotal: subTotal,
            totalItems: totalItems,
        })
    );

})

export const removeCartItemController = asyncHandler(async (req, res) => {
    const deletedItem = await removeCartItemsService(req);

    return res
    .status(200)
    .json(new ApiResponse(200, "Item deleted successfully.", deletedItem))
})