import { Router } from "express";
import * as bookingController from "./booking.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireStudent } from "../../middlewares/role.middleware";

const router = Router();

router.post("/bookings", authenticate, requireStudent, bookingController.createBooking);
router.get("/bookings", authenticate, bookingController.listBookings);
router.get("/bookings/:id", authenticate, bookingController.getBooking);
router.patch("/bookings/:id/status", authenticate, bookingController.updateStatus);

export default router;
