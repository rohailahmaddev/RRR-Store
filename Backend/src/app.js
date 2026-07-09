import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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

app.use(cookieParser());


import authRoutes from "./routes/auth.route.js";
import { errorHandler } from "./middlewares/errorHandler.js";

app.use("/api/user", authRoutes);

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

//error handler middleware 
app.use(errorHandler);
export default app;