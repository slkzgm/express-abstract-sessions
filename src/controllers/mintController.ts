// /src/controllers/mintController.ts
import { Request, Response } from "express";
import { mintNFT } from "../services/mintService";
import { logger } from "../utils/logger";

export async function mintHandler(req: Request, res: Response): Promise<void> {
  try {
    const sessionClient = (req as any).sessionClient;
    if (!sessionClient) {
      res.status(403).json({ error: "No active session" });
      return;
    }

    const { to, amount } = req.body;
    if (!to || !amount) {
      res.status(400).json({ error: "Missing 'to' or 'amount'" });
      return;
    }

    const txHash = await mintNFT(sessionClient, to, BigInt(amount));
    res.json({ success: true, txHash });
  } catch (error: any) {
    logger.error(`[ERROR] mintHandler => ${error.message}`);
    res.status(500).json({ error: error.message || "Mint failed" });
  }
}
