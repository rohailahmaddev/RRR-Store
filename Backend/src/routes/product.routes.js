import Router from "router"
import { activateProductListing, addProduct, createCategory, deactivateProductListing, deleteCategory, deleteProductSize, deleteReviews, getAllCategories, getDeactivatedProductListing, getProducts, getSingleProduct, setReviews, updateCategory, updateProductListing, updateReviews } from "../controllers/product.controllers.js"
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
router.route("/delete-size/:id").delete(deleteProductSize)

//product reviews route
router.route("/product/review/:id").post(verifyJWT,setReviews)
router.route("/product/review-update/:id").patch(verifyJWT, updateReviews)
router.route("/product/review-delete/:id").delete(verifyJWT, deleteReviews)


//product category route
router.route("/create-category").post(createCategory)
router.route("/categories").get(getAllCategories)
router.route("/update-category/:id").patch(updateCategory)
router.route("/delete-category/:id").delete(deleteCategory)

export default router;