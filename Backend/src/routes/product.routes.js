import Router from "router"
import { activateProductListing, addProduct, createCategory, deactivateProductListing, deleteCategory, deleteProductSize, deleteReviews, getAllCategories, getDeactivatedProductListing, getProducts, getSingleProduct, setReviews, updateCategory, updateProductListing, updateReviews } from "../controllers/product.controllers.js"
import upload from "../middlewares/multer.middleware.js"
import { isAdmin } from "../middlewares/isAdmin.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Static routes first
router.route("/products/inactive").get(verifyJWT, isAdmin, getDeactivatedProductListing);

// Core product CRUD
router.route("/products")
  .post(verifyJWT, isAdmin, upload.fields([{ name: "images", maxCount: 4 }]), addProduct)
  .get(getProducts);

router.route("/products/:id")
  .get(getSingleProduct)
  .patch(verifyJWT, isAdmin, upload.fields([{ name: "images", maxCount: 4 }]), updateProductListing);

router.route("/products/:id/activate").patch(verifyJWT, isAdmin, activateProductListing);
router.route("/products/:id/deactivate").patch(verifyJWT, isAdmin, deactivateProductListing);

// Sizes (nested under product)
router.route("/products/:productId/sizes")
  .post(verifyJWT, isAdmin, addProductSize);
router.route("/products/:productId/sizes/:sizeId")
  .patch(verifyJWT, isAdmin, updateProductSize)
  .delete(verifyJWT, isAdmin, deleteProductSize);

// Reviews
router.route("/products/:id/reviews")
  .post(verifyJWT, setReviews)
  .patch(verifyJWT, updateReviews)
  .delete(verifyJWT, deleteReviews);

// Categories
router.route("/categories")
  .post(verifyJWT, isAdmin, createCategory)
  .get(getAllCategories);

router.route("/categories/:id")
  .patch(verifyJWT, isAdmin, updateCategory)
  .delete(verifyJWT, isAdmin, deleteCategory);

export default router;