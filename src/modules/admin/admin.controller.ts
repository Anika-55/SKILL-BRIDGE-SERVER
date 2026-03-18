import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import * as adminService from "./admin.service";
import { HttpError } from "../../utils/httpError";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: "Internal server error" });
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const role = req.query.role as UserRole | undefined;
    const users = await adminService.listUsers(role);
    return res.status(200).json({ users });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateUserBan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body as { isBanned: boolean };
    const user = await adminService.setUserBan(id, isBanned);
    return res.status(200).json({ user });
  } catch (error) {
    return handleError(res, error);
  }
};
