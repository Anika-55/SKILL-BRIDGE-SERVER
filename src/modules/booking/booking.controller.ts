import type { Request, Response } from "express";
import type { BookingStatus } from "@prisma/client";
import * as bookingService from "./booking.service";
import { HttpError } from "../../utils/httpError";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tutorId, date, startTime, endTime } = req.body as {
      tutorId: string;
      date: string;
      startTime: string;
      endTime: string;
    };

    const booking = await bookingService.createBooking({
      studentId: req.user.id,
      tutorId,
      date,
      startTime,
      endTime,
    });

    return res.status(201).json({ booking });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listBookings = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page, limit } = req.query;
    const result = await bookingService.listBookingsForUser(req.user.id, req.user.role, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getBooking = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const booking = await bookingService.getBookingById(id, req.user.id);
    return res.status(200).json({ booking });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body as { status: BookingStatus };

    const booking = await bookingService.updateBookingStatus(
      id,
      req.user.id,
      req.user.role,
      status,
    );

    return res.status(200).json({ booking });
  } catch (error) {
    return handleError(res, error);
  }
};
