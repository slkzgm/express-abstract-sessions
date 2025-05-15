// /src/controllers/mintController.ts
import { Request, Response } from "express";
import {
  createSessionClient,
  SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { privateKeyToAccount } from "viem/accounts";
import { mintNFT } from "../services/mintService";
import { CONFIG } from "../config";
import { logger } from "../utils/logger";

export async function mintHandler(req: Request, res: Response): Promise<void> {
  try {
    const sessionRecord = (req as any).sessionRecord;
    const address = req.user?.address as `0x${string}`;

    if (!sessionRecord) {
      res.status(403).json({ error: "No active session" });
      return;
    }

    const { sessionConfigJson, privateKey } = sessionRecord;
    if (!sessionConfigJson || !privateKey) {
      res.status(500).json({ error: "Session record incomplete." });
      return;
    }

    const sessionConfig = JSON.parse(sessionConfigJson) as SessionConfig;
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const sessionClient = createSessionClient({
      chain: CONFIG.chain,
      signer: account,
      account: address,
      session: sessionConfig,
    });

    const { to, amount } = req.body;
    if (!to || !amount) {
      res.status(400).json({ error: "Missing 'to' or 'amount'" });
      return;
    }

    const txHash = await mintNFT(sessionClient, to, BigInt(amount));
    res.json({ success: true, txHash });
  } catch (error: any) {
    logger.error(`[ERROR] mintHandler => ${error.message}`);
    res.status(500).json({ error: error.message || "Failed to mint" });
  }
}
