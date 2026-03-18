import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { HttpError } from "../utils/httpError";

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, "Unauthorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "Forbidden"));
    }

    return next();
  };
};

export const requireAdmin = requireRole("ADMIN");
export const requireTutor = requireRole("TUTOR");
export const requireStudent = requireRole("STUDENT");
