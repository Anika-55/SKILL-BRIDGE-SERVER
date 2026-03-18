import { Router } from "express";
import * as tutorController from "./tutor.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireTutor } from "../../middlewares/role.middleware";

const router = Router();

router.put("/profile", authenticate, requireTutor, tutorController.upsertProfile);
router.put("/availability", authenticate, requireTutor, tutorController.updateAvailability);

router.get("/tutors", tutorController.listTutors);
router.get("/tutors/:id", tutorController.getTutor);

export default router;
