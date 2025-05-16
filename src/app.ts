// /src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./utils/logger";
import { CONFIG } from "./config";

export const app = express();

// Basic middlewares
app.use(cors({ origin: CONFIG.clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Attach main router
app.use("/api", router);

// Example root route
app.get("/", (req, res) => {
  res.json({ message: "API is up and running!" });
});

// Startup log
logger.info("Express application configured.");

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  logger.error(`Global error handler => ${err.message}`);
  res.status(500).json({ error: "Internal Server Error" });
});
