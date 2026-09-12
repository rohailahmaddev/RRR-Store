import Router from "express";
import { RequestId } from "../../middlewares/requestId.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../../middlewares/isAdmin.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { 
    createCategorySchema, 
    updateCategorySchema 
} from "../../validations/category.validation.js";
import { 
    createCategoryController, 
    deleteCategoryController, 
    getCategoriesController, 
    updateCategoryController 
} from "./categories.controllers.js";

const router = Router();

router.route("/add-category").post(
    RequestId,
    verifyJWT,
    isAdmin,
    validate(createCategorySchema),
    createCategoryController
)

router.route("/categories").get(
    RequestId,
    getCategoriesController
)

router.route("/update-category/:id").patch(
    RequestId,
    verifyJWT,
    isAdmin,
    validate(updateCategorySchema),
    updateCategoryController
)

router.route("/delete-category/:id").delete(
    RequestId,
    verifyJWT,
    isAdmin,
    deleteCategoryController
)

export default router;