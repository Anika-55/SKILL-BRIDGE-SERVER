import prisma from "../../utils/prisma";
import { HttpError } from "../../utils/httpError";
import type { BookingStatus, UserRole } from "@prisma/client";

type Pagination = { page?: number; limit?: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sameUtcDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const minutesSinceMidnight = (date: Date) =>
  date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;

export type CreateBookingInput = {
  studentId: string;
  tutorId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export const createBooking = async (input: CreateBookingInput) => {
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  const date = new Date(input.date);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Invalid date/time values");
  }

  if (!sameUtcDay(start, date) || !sameUtcDay(end, date)) {
    throw new HttpError(400, "Start/end time must be on the booking date");
  }

  if (end <= start) {
    throw new HttpError(400, "End time must be after start time");
  }

  if (input.tutorId === input.studentId) {
    throw new HttpError(400, "Cannot book yourself");
  }

  const tutor = await prisma.user.findUnique({
    where: { id: input.tutorId },
    select: { id: true, role: true, isBanned: true },
  });

  if (!tutor || tutor.role !== "TUTOR") {
    throw new HttpError(404, "Tutor not found");
  }

  if (tutor.isBanned) {
    throw new HttpError(403, "Tutor is banned");
  }

  // Ensure tutor has availability and the slot fits inside one of their windows
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: input.tutorId },
    include: { availability: true },
  });

  if (!tutorProfile) {
    throw new HttpError(404, "Tutor profile not found");
  }

  if (!tutorProfile.availability || tutorProfile.availability.length === 0) {
    throw new HttpError(400, "Tutor has no availability");
  }

  const bookingDay = start.getUTCDay();
  const startMinutes = minutesSinceMidnight(start);
  const endMinutes = minutesSinceMidnight(end);

  const fitsAvailability = tutorProfile.availability.some((slot) => {
    if (slot.dayOfWeek !== bookingDay) return false;
    const slotStart = minutesSinceMidnight(slot.startTime);
    const slotEnd = minutesSinceMidnight(slot.endTime);
    return startMinutes >= slotStart && endMinutes <= slotEnd;
  });

  if (!fitsAvailability) {
    throw new HttpError(400, "Selected time is outside tutor availability");
  }

  // Check for overlapping bookings for this tutor (exclude cancelled)
  const conflict = await prisma.booking.findFirst({
    where: {
      tutorId: input.tutorId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
    select: { id: true },
  });

  if (conflict) {
    throw new HttpError(409, "Time slot unavailable");
  }

  const booking = await prisma.booking.create({
    data: {
      studentId: input.studentId,
      tutorId: input.tutorId,
      date,
      startTime: start,
      endTime: end,
      status: "CONFIRMED",
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      tutor: { select: { id: true, name: true, email: true } },
    },
  });

  return booking;
};

export const listBookingsForUser = async (userId: string, role: UserRole, pagination?: Pagination) => {
  const page = clamp(pagination?.page ?? 1, 1, 10000);
  const limit = clamp(pagination?.limit ?? 10, 1, 50);
  const skip = (page - 1) * limit;

  const where = role === "TUTOR" ? { tutorId: userId } : { studentId: userId };

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    data: bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBookingById = async (bookingId: string, userId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      tutor: { select: { id: true, name: true, email: true } },
    },
  });

  if (!booking) {
    throw new HttpError(404, "Booking not found");
  }

  if (booking.studentId !== userId && booking.tutorId !== userId) {
    throw new HttpError(403, "Forbidden");
  }

  return booking;
};

export const updateBookingStatus = async (
  bookingId: string,
  userId: string,
  userRole: UserRole,
  status: BookingStatus,
) => {
  if (status !== "COMPLETED" && status !== "CANCELLED") {
    throw new HttpError(400, "Status must be COMPLETED or CANCELLED");
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    throw new HttpError(404, "Booking not found");
  }

  if (status === "COMPLETED") {
    if (userRole !== "TUTOR" || booking.tutorId !== userId) {
      throw new HttpError(403, "Only the tutor can complete this booking");
    }
  }

  if (status === "CANCELLED") {
    if (userRole !== "STUDENT" || booking.studentId !== userId) {
      throw new HttpError(403, "Only the student can cancel this booking");
    }
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: {
      student: { select: { id: true, name: true, email: true } },
      tutor: { select: { id: true, name: true, email: true } },
    },
  });
};
