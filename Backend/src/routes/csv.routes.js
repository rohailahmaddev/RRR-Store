import Router from "router";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { exportProductCSV, exportPrductVariantCSV, importProductCSV } from "../controllers/csv.controllers.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/export-csv").get(verifyJWT, isAdmin, exportProductCSV);
router.route("/export-detail-csv").get( exportPrductVariantCSV);
router.route("/import-csv").post(upload.single("file"),importProductCSV)

export default router;