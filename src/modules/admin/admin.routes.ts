import { Router } from "express";
import * as adminController from "./admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/role.middleware";

const router = Router();

router.get("/users", authenticate, requireAdmin, adminController.getUsers);
router.patch("/users/:id", authenticate, requireAdmin, adminController.updateUserBan);

export default router;
