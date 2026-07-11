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


// other configurations
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//cookies parser
app.use(cookieParser());

app.use(compression());

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js"

//auth route
app.use("/api/user", authRoutes);

//product route
app.use("/api",productRoutes)

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});


//error handler middleware 
app.use(errorHandler);

export default app;