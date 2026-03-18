import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import prisma from "../../utils/prisma";
import env from "../../config/env";
import { HttpError } from "../../utils/httpError";

const SALT_ROUNDS = 12;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

const signToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, { expiresIn: "7d" });
};

export const register = async (input: RegisterInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!input.name || !normalizedEmail || !input.password) {
    throw new HttpError(400, "Missing required fields");
  }

  if (input.role !== "STUDENT" && input.role !== "TUTOR") {
    throw new HttpError(400, "Invalid role selection");
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new HttpError(409, "Email already in use");
  }

  const hashed = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: normalizedEmail,
      password: hashed,
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  });

  const token = signToken(user.id, user.role);
  return { user, token };
};

export const login = async (input: LoginInput) => {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !input.password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (user.isBanned) {
    throw new HttpError(403, "Account is banned");
  }

  const token = signToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    },
    token,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return user;
};
