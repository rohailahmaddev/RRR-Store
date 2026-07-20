import Router from "router";
import { cancleMyOrder, createOrder, getAllOrders, getMyOrderById, getMyOrders } from "../controllers/order.controllers.js";

const router = Router();

router.route("/place-order").post(createOrder)
router.route("/my-orders").get(getMyOrders)
router.route("/single-order").get(getMyOrderById)
router.route("/cancle-order").patch(cancleMyOrder)
router.route("/admin/orders").get(getAllOrders)
router.route("/admin/single-order").get(getOrderById)

export default router;