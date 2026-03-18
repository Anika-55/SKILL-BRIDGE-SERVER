import prisma from "../../utils/prisma";
import { HttpError } from "../../utils/httpError";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type UpsertTutorProfileInput = {
  userId: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
};

export type AvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type TutorListFilters = {
  category?: string;
  minRate?: number;
  maxRate?: number;
  minRating?: number;
  page?: number;
  limit?: number;
};

export const upsertProfile = async (input: UpsertTutorProfileInput) => {
  if (!input.bio || !input.hourlyRate || !Array.isArray(input.subjects)) {
    throw new HttpError(400, "Missing required fields");
  }

  const subjects = input.subjects
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (subjects.length === 0) {
    throw new HttpError(400, "At least one subject is required");
  }

  const profile = await prisma.tutorProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      bio: input.bio,
      hourlyRate: input.hourlyRate,
      subjects: {
        create: subjects.map((name) => ({
          category: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
    },
    update: {
      bio: input.bio,
      hourlyRate: input.hourlyRate,
      subjects: {
        deleteMany: {},
        create: subjects.map((name) => ({
          category: {
            connectOrCreate: {
              where: { name },
              create: { name },
            },
          },
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      subjects: { include: { category: true } },
    },
  });

  return profile;
};

export const replaceAvailability = async (userId: string, slots: AvailabilitySlot[]) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new HttpError(404, "Tutor profile not found");
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    throw new HttpError(400, "Availability slots are required");
  }

  const normalized = slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: new Date(slot.startTime),
    endTime: new Date(slot.endTime),
  }));

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { tutorId: profile.id } }),
    prisma.availability.createMany({
      data: normalized.map((slot) => ({
        tutorId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    }),
  ]);

  return prisma.availability.findMany({ where: { tutorId: profile.id } });
};

export const listTutors = async (filters: TutorListFilters) => {
  const page = clamp(filters.page ?? 1, 1, 10000);
  const limit = clamp(filters.limit ?? 10, 1, 50);
  const skip = (page - 1) * limit;

  const where: Parameters<typeof prisma.tutorProfile.findMany>[0]["where"] = {
    user: { role: "TUTOR", isBanned: false },
  };

  if (filters.minRate !== undefined || filters.maxRate !== undefined) {
    where.hourlyRate = {};
    if (filters.minRate !== undefined) where.hourlyRate.gte = filters.minRate;
    if (filters.maxRate !== undefined) where.hourlyRate.lte = filters.maxRate;
  }

  if (filters.minRating !== undefined) {
    where.rating = { gte: filters.minRating };
  }

  if (filters.category) {
    where.subjects = { some: { category: { name: filters.category } } };
  }

  const [total, tutors] = await prisma.$transaction([
    prisma.tutorProfile.count({ where }),
    prisma.tutorProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ rating: "desc" }, { totalReviews: "desc" }],
      include: {
        user: { select: { id: true, name: true } },
        subjects: { include: { category: true } },
      },
    }),
  ]);

  return {
    data: tutors,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTutorDetails = async (tutorProfileId: string) => {
  const profile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      subjects: { include: { category: true } },
      availability: true,
    },
  });

  if (!profile) {
    throw new HttpError(404, "Tutor not found");
  }

  const reviews = await prisma.review.findMany({
    where: { tutorId: profile.userId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return { profile, reviews };
};
