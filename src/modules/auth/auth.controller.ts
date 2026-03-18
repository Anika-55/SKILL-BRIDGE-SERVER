import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import * as authService from "./auth.service";
import { HttpError } from "../../utils/httpError";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: UserRole;
    };

    const result = await authService.register({ name, email, password, role });
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await authService.getCurrentUser(req.user.id);
    return res.status(200).json({ user });
  } catch (error) {
    return handleError(res, error);
  }
};
