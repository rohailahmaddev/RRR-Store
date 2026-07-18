import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import ApiError from "./utils/ApiError.js";
import compression from "compression";

const app = express();

//cors configrations
app.use(
    cors({
        origin:process.env.CORS_ORIGIN || "http://localhost:5473",
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


import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js"
import cartRoutes from "./routes/cart.routes.js"

//auth route
app.use("/api/user", authRoutes);

//product route
app.use("/api",productRoutes)

//cart route
app.use("/api",cartRoutes)

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});


//error handler middleware 
app.use(errorHandler);

export default app;