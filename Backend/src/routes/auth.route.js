import Router from "router";
import { activateUser, deactivateUser, forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resendVerificationEmail, resetPassword, verifyEmail } from "../controllers/auth.controllers.js";
import upload from "../middlewares/multer.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar_url",
            maxCount:1
        }
    ]) , registerUser)

router.route("/verify-email/:token").get(verifyEmail)
router.route("/resend-verification-email").post(resendVerificationEmail)
router.route("/login").post(loginUser)
router.route("/logout").post(logoutUser)
router.route("/refresh-token").post(refreshToken)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password/:token").post(resetPassword)
router.route("/deactivate-user/:userId").put(isAdmin, deactivateUser)
router.route("/activate-user/:userId").put(isAdmin, activateUser)

export default router;
