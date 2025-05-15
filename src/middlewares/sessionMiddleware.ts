// /src/middlewares/sessionMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { fetchAndSyncSession } from "../services/sessionService";
import { logger } from "../utils/logger";

export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const record = await fetchAndSyncSession(req.user.address);
    if (!record || record.status !== "active") {
      res
        .status(403)
        .json({
          error:
            "No active session. Please create or confirm your session first.",
        });
      return;
    }

    // Attach session DB record to request for later usage
    (req as any).sessionRecord = record;
    next();
  } catch (error) {
    logger.error(`[ERROR] sessionMiddleware => ${(error as Error).message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
