// /src/controllers/authController.ts
import { Request, Response, NextFunction } from "express";
import {
  requestSiweMessageService,
  verifySiweSignatureService,
} from "../services/authService";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

export async function getSiweMessageHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { address } = req.query;
    if (typeof address !== "string") {
      res.status(400).json({ error: "Missing or invalid address" });
      return;
    }

    const siweMessage = await requestSiweMessageService(address.toLowerCase());
    res.json({ siweMessage });
  } catch (error) {
    logger.error(
      `[ERROR] getSiweMessageHandler => ${(error as Error).message}`,
    );
    res.status(500).json({ error: "Failed to create SIWE message" });
  }
}

export async function siweLoginHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      res.status(400).json({ error: "Missing address or signature" });
      return;
    }

    const token = await verifySiweSignatureService(
      address.toLowerCase(),
      signature,
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: CONFIG.isProd,
      sameSite: CONFIG.isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error(`[ERROR] siweLoginHandler => ${(error as Error).message}`);
    res.status(401).json({ error: "SIWE Authentication failed" });
  }
}

export async function logoutHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: CONFIG.isProd,
    sameSite: CONFIG.isProd ? "none" : "lax",
  });
  res.json({ success: true });
}
