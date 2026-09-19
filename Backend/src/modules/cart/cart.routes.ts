import Router from "express"
import { RequestId } from "../../middlewares/requestId.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addToCartSchema } from "../../validations/cart.validation.js";
import { createCartContorller } from "./cart.controllers.js";

const router = Router();

router.route("/create-cart").post(
    RequestId,
    verifyJWT,
    validate(addToCartSchema),
    createCartContorller
)

export default router;