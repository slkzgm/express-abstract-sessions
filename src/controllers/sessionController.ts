// /src/controllers/sessionController.ts
import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { createSessionRecord } from "../services/sessionService";
import { getOrCreateSessionClient } from "../services/sessionClientCache";

export async function createSessionHandler(req: Request, res: Response) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const record = await createSessionRecord(req.user.address);
    res.json({
      sessionKeyAddress: record.sessionKeyAddress,
      sessionConfig: JSON.parse(record.sessionConfigJson),
    });
  } catch (error: any) {
    logger.error(`[ERROR] createSessionHandler => ${error.message}`);
    res.status(500).json({ error: "Failed to create session" });
  }
}

export async function getSessionStatusHandler(req: Request, res: Response) {
  try {
    if (!req.user?.address) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const sessionClient = await getOrCreateSessionClient(req.user.address);
    if (!sessionClient) {
      res.json({ active: false });
      return;
    }

    // If we have a valid client, it's active on-chain
    res.json({ active: true });
  } catch (error: any) {
    logger.error(`[ERROR] getSessionStatusHandler => ${error.message}`);
    res.status(500).json({ error: "Internal error" });
  }
}
