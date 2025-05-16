// /src/middlewares/sessionMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { getOrCreateSessionClient } from "../services/sessionClientCache";
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

    const sessionClient = await getOrCreateSessionClient(req.user.address);
    if (!sessionClient) {
      res
        .status(403)
        .json({ error: "Session invalid or not created on-chain" });
      return;
    }

    (req as any).sessionClient = sessionClient;
    next();
  } catch (error) {
    logger.error(`[ERROR] sessionMiddleware => ${(error as Error).message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
