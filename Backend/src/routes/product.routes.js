import Router from "router"
import { activateProductListing, addProduct, deactivateProductListing, getDeactivatedProductListing, getProducts, getSingleProduct, updateProductListing } from "../controllers/product.controllers.js"
import upload from "../middlewares/multer.middleware.js"
import { isAdmin } from "../middlewares/isAdmin.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/add-product").post(
    upload.fields([{ 
        name: "images", 
        maxCount: 4
    }]), addProduct)

router.route("/products").get(getProducts)
router.route("/single-product/:id").get(getSingleProduct)
router.route("/deactivate-product/:id").patch(deactivateProductListing)
router.route("/activate-product/:id").patch(activateProductListing)
router.route("/deactived-products").get(getDeactivatedProductListing)
router.route("/update-product/:id").patch(
    upload.fields([{ 
        name: "images", 
        maxCount: 4
    }]),
    updateProductListing)

export default router;