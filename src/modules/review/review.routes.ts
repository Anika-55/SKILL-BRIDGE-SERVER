import { Router } from "express";
import * as reviewController from "./review.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireStudent } from "../../middlewares/role.middleware";

const router = Router();

router.post("/reviews", authenticate, requireStudent, reviewController.createReview);

export default router;
