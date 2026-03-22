import type { Request, Response } from "express";
import * as reviewService from "./review.service";
import { HttpError } from "../../utils/httpError";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const createReview = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { tutorId, rating, comment } = req.body as {
      tutorId: string;
      rating: number;
      comment?: string;
    };

    const review = await reviewService.createReview({
      studentId: req.user.id,
      tutorId,
      rating,
      comment,
    });

    return res.status(201).json({ review });
  } catch (error) {
    return handleError(res, error);
  }
};
