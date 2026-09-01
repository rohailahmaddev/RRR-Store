import Router from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { RequestId } from "../../middlewares/requestId.middleware.js";
import { isAdmin } from "../../middlewares/isAdmin.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createProductSchema } from "../../validations/product.validation.js";
import upload from "../../middlewares/multer.middleware.js";
import { addProductController, updateProductListingController } from "./product.controllers.js";
import { validateImages } from "../../middlewares/image.middleware.js";
import { parseJsonFields } from "../../middlewares/parseJsonFields.middleware.js";

const router = Router();

router.route("/add-product").post(
    RequestId,
    verifyJWT,
    isAdmin,
    upload.fields([{ name: "images", maxCount: 4 }]),
    validateImages({
        min: 1,
        max: 5,
    }),
    parseJsonFields(["productVariants"]),
    validate(createProductSchema),
    addProductController
)

router.route("/update-product/:id").put(
    RequestId,
    verifyJWT,
    isAdmin,
    upload.fields([{ name: "images", maxCount: 4 }]),
    validateImages({
        min:0,
        max:5,
    }),
    parseJsonFields(["productVariants","deletedImageIds"]),
    updateProductListingController
)

export default router;