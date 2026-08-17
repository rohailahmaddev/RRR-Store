import express from "express";
import {env} from "./config/env.js"
import { RequestId } from "./middlewares/requestId.middleware.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import {ApiError} from "./shared/utility/ApiError.js";
import compression from "compression";

const app = express();

//assign id to every request
app.use(RequestId)

//cors configrations
app.use(
    cors({
        origin:env.CORS_ORIGIN || "http://localhost:5473",
        credentials:true
    })
);

//compression
app.use(compression());

// other configurations
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//cookies parser
app.use(cookieParser());


import authRoutes from "./modules/auth/auth.routes.js";
// import productRoutes from "./routes/product.routes.js";
// import cartRoutes from "./routes/cart.routes.js";
// import orderRoutes from "./routes/order.routes.js";
// import csvRoutes from "./routes/csv.routes.js";
// import inventoryRoutes from "./modules/inventory/inventory.route.js"

//auth route
app.use("/api/auth", authRoutes);

//product route
// app.use("/api/v1", productRoutes);

//cart route
// app.use("/api",cartRoutes)

//order route
// app.use("/api/order",orderRoutes)

//csv route
// app.use("/api/csv",csvRoutes)

//invetory route
// app.use("/api/admin/",inventoryRoutes)

//logs
// app.use("/api/admin/")

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

//error handler middleware 
app.use(errorHandler);

export default app;