import Router from "router"
import { addToCart, clearCart, getCart, removeCartItem, updateCartItemQuantity } from "../controllers/cart.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/add-to-cart").post(verifyJWT, addToCart)
router.route("/cart-items").get(verifyJWT, getCart)
router.route("/delete-cart-item").delete(verifyJWT, removeCartItem)
router.route("/cart-quantity-update").patch(verifyJWT, updateCartItemQuantity)
router.route("cart-cleared").delete(verifyJWT,clearCart)

export default router;