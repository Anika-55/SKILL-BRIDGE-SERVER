import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";
import { HttpError } from "./utils/httpError";

const app = express();

// Core middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("combined"));

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running" });
});

// Routes
app.use("/api/auth", authRoutes);

// Not found handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return res.status(500).json({ message: "Internal server error" });
});

export default app;
