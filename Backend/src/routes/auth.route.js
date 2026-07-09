import Router from "router";
import { registerUser, verifyEmail } from "../controllers/auth.controllers.js";
import upload from "../middlewares/multer.middlewares.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar_url",
            maxCount:1
        }
    ]) , registerUser)

router.route("/verify-email/:token").get(verifyEmail)

export default router;
