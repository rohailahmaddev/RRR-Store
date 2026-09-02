import Router from "express";

import { addProductVariants, getProductVariantsController, updateProductVariantsController } from "./productVariants.controllers.js";
import { deleteProductVariantController } from "./productVariants.controllers.js";
import { RequestId } from "../../middlewares/requestId.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../../middlewares/isAdmin.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { productVariantSchema } from "../../validations/product.validation.js";

const router = Router();

router.route("/:id/variants").post(
  RequestId,
  verifyJWT,
  isAdmin,
  validate(productVariantSchema),
  addProductVariants
);

router.route("/:id/variants").put(
  RequestId,
  getProductVariantsController,
);

router.route("/:id/variants").put(
  RequestId,
  verifyJWT,
  isAdmin,
  validate(productVariantSchema),
  updateProductVariantsController
);

router.route("/:productId/variants/:variantId").delete(
  RequestId,
  verifyJWT,
  isAdmin,
  deleteProductVariantController
);

export default router;