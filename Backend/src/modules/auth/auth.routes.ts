import Router from "express"
import { RequestId } from "../../middlewares/requestId.middleware.js"
import { registerRateLimiter } from "../../middlewares/rateLimiter.middleware.js"
import upload from "../../middlewares/multer.middleware.js"
import { validate } from "../../middlewares/validate.middleware.js"
import { registerSchema } from "../../validations/auth.validation.js"
import { registerUserController } from "./auth.controllers.js"

const router = Router()

router.route("/register").post(
    RequestId,
    registerRateLimiter,
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    validate(registerSchema),
    registerUserController
)

export default router