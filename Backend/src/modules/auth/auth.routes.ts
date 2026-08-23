import Router from "express"
import { RequestId } from "../../middlewares/requestId.middleware.js"
import { loginRateLimiter, passwordResetRateLimiter, registerRateLimiter, verificationEmailRateLimiter, verifyEmailRateLimiter } from "../../middlewares/rateLimiter.middleware.js"
import upload from "../../middlewares/multer.middleware.js"
import { validate } from "../../middlewares/validate.middleware.js"
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../../validations/auth.validation.js"
import { activateUserAccountController, deactivateUserAccountController, forgotPasswordController, loginUserController, logoutUserController, refreshTokenController, registerUserController, resendVerificationEmailController, resetPasswordController, verifyEmailController } from "./auth.controllers.js"
import { verifyJWT } from "../../middlewares/auth.middleware.js"
import { isAdmin } from "../../middlewares/isAdmin.middleware.js"

const router = Router()

router.route("/register").post(
    RequestId,
    registerRateLimiter,
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    validate(registerSchema),
    registerUserController
)
router.route("/verify-email/:token").get(
    RequestId,
    verifyEmailRateLimiter,
    verifyEmailController
);

router.route("/resend-verification-email").post(
    RequestId,
    verificationEmailRateLimiter,
    resendVerificationEmailController
)

router.route("/login").post(
    RequestId,
    loginRateLimiter,
    validate(loginSchema),
    loginUserController
)

router.route("/logout").post(
    RequestId,
    verifyJWT,
    logoutUserController
)

router.route("/refresh-token").post(
    RequestId,
    refreshTokenController
)

router.route("/forgot-password").post(
    RequestId,
    validate(forgotPasswordSchema),
    forgotPasswordController
)

router.route("/reset-password/:token").post(
    RequestId,
    passwordResetRateLimiter,
    validate(resetPasswordSchema),
    resetPasswordController
)

router.route("/admin/user/:id/deactivate").patch(
    RequestId,
    verifyJWT,
    isAdmin,
    deactivateUserAccountController
)

router.route("/admin/user/:id/activate").patch(
    RequestId,
    verifyJWT,
    isAdmin,
    activateUserAccountController
)



export default router