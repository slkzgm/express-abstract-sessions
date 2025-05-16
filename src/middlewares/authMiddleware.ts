// /src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.jwt;
    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const decoded = jwt.verify(token, CONFIG.jwtSecret) as { address: string };
    req.user = { address: decoded.address.toLowerCase() };
    next();
  } catch (error) {
    logger.error(`[ERROR] authMiddleware => ${(error as Error).message}`);
    res.status(401).json({ error: "Unauthorized" });
  }
}
