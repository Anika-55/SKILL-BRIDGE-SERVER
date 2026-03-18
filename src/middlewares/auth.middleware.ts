import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";
import { HttpError } from "../utils/httpError";
import type { UserRole } from "@prisma/client";

type TokenPayload = {
  sub: string;
  role: UserRole;
};

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpError(401, "Unauthorized");
    }

    const token = header.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;

    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    return next(error);
  }
};
