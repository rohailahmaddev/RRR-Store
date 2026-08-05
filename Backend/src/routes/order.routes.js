import Router from "router";
import { cancleMyOrder, createOrder, getAllOrders, getMyOrderById, getMyOrders, getOrderById } from "../controllers/order.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/place-order").post(verifyJWT, createOrder)
router.route("/my-orders").get(verifyJWT, getMyOrders)
router.route("/single-order/:id").get(verifyJWT, getMyOrderById)
router.route("/cancle-order/:id").patch(verifyJWT, cancleMyOrder)
router.route("/admin/orders").get(getAllOrders)
router.route("/admin/single-order/:id").get(getOrderById)


export default router;