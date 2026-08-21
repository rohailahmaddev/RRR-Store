import Router from "express"
import { RequestId } from "../../middlewares/requestId.middleware.js"
import { loginRateLimiter, registerRateLimiter, verificationEmailRateLimiter, verifyEmailRateLimiter } from "../../middlewares/rateLimiter.middleware.js"
import upload from "../../middlewares/multer.middleware.js"
import { validate } from "../../middlewares/validate.middleware.js"
import { loginSchema, registerSchema } from "../../validations/auth.validation.js"
import { loginUserController, logoutUserController, refreshTokenController, registerUserController, resendVerificationEmailController, verifyEmailController } from "./auth.controllers.js"
import { verifyJWT } from "../../middlewares/auth.middleware.js"

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

router.route("/logout").get(
    RequestId,
    verifyJWT,
    logoutUserController
)

router.route("/refresh-token").get(
    RequestId,
    refreshTokenController
)
export default router