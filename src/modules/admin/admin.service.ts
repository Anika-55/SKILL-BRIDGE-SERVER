import prisma from "../../utils/prisma";
import { HttpError } from "../../utils/httpError";
import type { UserRole } from "@prisma/client";

export const listUsers = async (role?: UserRole) => {
  const where = role ? { role } : undefined;

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const setUserBan = async (userId: string, isBanned: boolean) => {
  if (typeof isBanned !== "boolean") {
    throw new HttpError(400, "isBanned must be boolean");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isBanned },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  });

  return user;
};
