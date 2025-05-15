// /src/controllers/sessionController.ts
import { Request, Response } from "express";
import {
  createOrGetSessionKey,
  confirmSession,
  fetchAndSyncSession,
} from "../services/sessionService";
import { replaceBigInt } from "../utils/serialize";
import { logger } from "../utils/logger";

export async function getOrCreateSessionHandler(req: Request, res: Response) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { status, sessionKeyAddress, sessionConfig } =
      await createOrGetSessionKey(req.user.address);

    res.json({
      status,
      sessionKeyAddress,
      sessionConfig: replaceBigInt(sessionConfig),
    });
  } catch (error: any) {
    logger.error(`[ERROR] getOrCreateSessionHandler => ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

export async function confirmSessionHandler(req: Request, res: Response) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await confirmSession(req.user.address);
    res.json({ success: true });
  } catch (error: any) {
    logger.error(`[ERROR] confirmSessionHandler => ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

/**
 * getSessionStatusHandler
 * Always checks on-chain => updates DB => returns final status
 */
export async function getSessionStatusHandler(req: Request, res: Response) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const record = await fetchAndSyncSession(req.user.address);
    if (!record) {
      res.json({ status: "none" });
      return;
    }

    res.json({
      status: record.status,
      sessionKeyAddress: record.sessionKeyAddress,
    });
  } catch (error: any) {
    logger.error(`[ERROR] getSessionStatusHandler => ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}
