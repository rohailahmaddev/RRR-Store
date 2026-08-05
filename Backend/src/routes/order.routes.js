import Router from "router";
import { adminCancelOrder, cancleMyOrder, createOrder, getAllOrders, getMyOrderById, getMyOrders, getOrderById, getOrderStats, updateOrderStatus, updatePaymentStatus } from "../controllers/order.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
const router = Router();

router.route("/place-order").post(verifyJWT, createOrder)
router.route("/my-orders").get(verifyJWT, getMyOrders)
router.route("/single-order/:id").get(verifyJWT, getMyOrderById)
router.route("/cancle-order/:id").patch(verifyJWT, cancleMyOrder)
router.route("/admin/orders").get(getAllOrders)
router.route("/admin/single-order/:id").get(getOrderById)

//admin routes
router.route("/update-order-status").post(verifyJWT, isAdmin, updateOrderStatus)
router.route("/update-payment-status").post(verifyJWT, isAdmin, updatePaymentStatus)
router.route("/admin-cancel-order").post(verifyJWT, isAdmin, adminCancelOrder)
router.route("/order-stats").get(verifyJWT, isAdmin, getOrderStats)

export default router;