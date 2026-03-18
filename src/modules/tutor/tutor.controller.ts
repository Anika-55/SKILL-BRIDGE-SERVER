import type { Request, Response } from "express";
import * as tutorService from "./tutor.service";
import { HttpError } from "../../utils/httpError";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const upsertProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bio, hourlyRate, subjects } = req.body as {
      bio: string;
      hourlyRate: number;
      subjects: string[];
    };

    const profile = await tutorService.upsertProfile({
      userId: req.user.id,
      bio,
      hourlyRate,
      subjects,
    });

    return res.status(200).json({ profile });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateAvailability = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { slots } = req.body as { slots: tutorService.AvailabilitySlot[] };
    const availability = await tutorService.replaceAvailability(req.user.id, slots);
    return res.status(200).json({ availability });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listTutors = async (req: Request, res: Response) => {
  try {
    const { category, minRate, maxRate, minRating, page, limit } = req.query;

    const result = await tutorService.listTutors({
      category: category ? String(category) : undefined,
      minRate: minRate ? Number(minRate) : undefined,
      maxRate: maxRate ? Number(maxRate) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getTutor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await tutorService.getTutorDetails(id);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};
