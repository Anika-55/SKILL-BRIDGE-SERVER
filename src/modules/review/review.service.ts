import prisma from "../../utils/prisma";
import { HttpError } from "../../utils/httpError";

export type CreateReviewInput = {
  studentId: string;
  tutorId: string;
  rating: number;
  comment?: string;
};

export const createReview = async (input: CreateReviewInput) => {
  const rating = Number(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "Rating must be between 1 and 5");
  }

  // Ensure a completed booking exists between student and tutor
  const completed = await prisma.booking.findFirst({
    where: {
      studentId: input.studentId,
      tutorId: input.tutorId,
      status: "COMPLETED",
    },
    select: { id: true },
  });

  if (!completed) {
    throw new HttpError(400, "Review allowed only after a completed booking");
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        studentId: input.studentId,
        tutorId: input.tutorId,
        rating,
        comment: input.comment ?? null,
      },
      include: {
        student: { select: { id: true, name: true } },
        tutor: { select: { id: true, name: true } },
      },
    });

    // Recompute tutor rating and total reviews
    const stats = await tx.review.aggregate({
      where: { tutorId: input.tutorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.tutorProfile.update({
      where: { userId: input.tutorId },
      data: {
        rating: stats._avg.rating ?? 0,
        totalReviews: stats._count.rating ?? 0,
      },
    });

    return review;
  });
};
