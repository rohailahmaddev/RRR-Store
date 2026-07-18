import Router from "router"
import { addToCart, getCart } from "../controllers/cart.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/add-to-cart").post(verifyJWT, addToCart)
router.route("/cart-items").get(verifyJWT, getCart)

export default router;