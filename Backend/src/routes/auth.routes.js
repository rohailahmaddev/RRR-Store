import Router from "router";
import { activateUser, deactivateUser, forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resendVerificationEmail, resetPassword, verifyEmail } from "../controllers/auth.controllers.js";
import upload from "../middlewares/multer.middleware.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([{ name: "avatar_url", maxCount: 1 }]),
  registerUser
);

router.route("/verify-email/:token").get(verifyEmail);
router.route("/resend-verification-email").post(resendVerificationEmail);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

router.route("/:userId/deactivate").patch(verifyJWT, isAdmin, deactivateUser);
router.route("/:userId/activate").patch(verifyJWT, isAdmin, activateUser);

export default router;
