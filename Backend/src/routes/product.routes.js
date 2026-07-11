import Router from "router"
import { addProduct, getProducts } from "../controllers/product.controllers.js"
import upload from "../middlewares/multer.middleware.js"
import { isAdmin } from "../middlewares/isAdmin.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/add-product").post(
    verifyJWT,
    isAdmin,
    upload.fields([{ 
        name: "image_url", 
        maxCount: 4
    }]), addProduct)

router.route("/products").get(getProducts)

export default router;