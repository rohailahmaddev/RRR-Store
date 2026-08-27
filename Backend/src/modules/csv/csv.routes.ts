import Router from "express"
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../../middlewares/isAdmin.middleware.js";
import { RequestId } from "../../middlewares/requestId.middleware.js";
import { exportCSVController, exportProductVariantCSVController, importProductVariantCSVController } from "./csv.controllers.js";

const router = Router();

router.route("/export-csv").get(
    RequestId,
    verifyJWT, 
    isAdmin, 
    exportCSVController
);

router.route("/export-product-variants-csv").get(
    RequestId,
    verifyJWT,
    isAdmin,
    exportProductVariantCSVController
)

router.route("/import-csv").post(
    RequestId,
    verifyJWT,
    isAdmin,
    importProductVariantCSVController
)

export default router;