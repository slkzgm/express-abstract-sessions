// /src/services/sessionClientCache.ts
import {
  createSessionClient,
  SessionClient,
  SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { privateKeyToAccount } from "viem/accounts";
import { logger } from "../utils/logger";
import { getSessionRecord, deleteSessionRecord } from "./sessionService";
import { decryptPrivateKey } from "../utils/encryption";
import { CONFIG } from "../config";
import { ChainEIP712 } from "viem/zksync";

interface CachedClient {
  sessionClient: SessionClient;
  lastAccess: number;
}

const sessionClientMap = new Map<string, CachedClient>();
const SESSION_CLIENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function getOrCreateSessionClient(
  address: string,
): Promise<SessionClient | null> {
  const now = Date.now();

  // 1) Check the cache
  const cached = sessionClientMap.get(address);
  if (cached) {
    const age = now - cached.lastAccess;
    if (age < SESSION_CLIENT_TTL_MS) {
      // On-chain check
      const stillActive = await isSessionOnChainActive(cached.sessionClient);
      if (!stillActive) {
        sessionClientMap.delete(address);
        await deleteSessionRecord(address);
        logger.debug(
          `Session invalid on-chain. Removed from cache/DB for ${address}.`,
        );
        return null;
      }
      cached.lastAccess = now;
      return cached.sessionClient;
    }
    // If expired in memory
    sessionClientMap.delete(address);
    logger.debug(`Session client for ${address} expired in local cache.`);
  }

  // 2) Not in cache => check DB
  const dbRecord = await getSessionRecord(address);
  if (!dbRecord) {
    logger.debug(`No session record in DB for ${address}.`);
    return null;
  }

  // 3) Decrypt, create session client
  const privateKeyPlain = decryptPrivateKey(dbRecord.privateKey);
  const sessionConfig = JSON.parse(dbRecord.sessionConfigJson) as SessionConfig;
  const signerAccount = privateKeyToAccount(privateKeyPlain as `0x${string}`);

  const sessionClient = createSessionClient({
    chain: CONFIG.chain as ChainEIP712,
    signer: signerAccount,
    account: address as `0x${string}`,
    session: sessionConfig,
  });

  // 4) On-chain check
  const stillActive = await isSessionOnChainActive(sessionClient);
  if (!stillActive) {
    await deleteSessionRecord(address);
    logger.debug(`Session invalid on-chain for ${address}, DB record deleted.`);
    return null;
  }

  // 5) Cache in memory
  sessionClientMap.set(address, {
    sessionClient,
    lastAccess: now,
  });
  logger.debug(`Created and cached new sessionClient for ${address}.`);

  return sessionClient;
}

async function isSessionOnChainActive(
  sessionClient: SessionClient,
): Promise<boolean> {
  try {
    const status = await sessionClient.getSessionStatus();
    return status === 1;
  } catch (error) {
    logger.error(`isSessionOnChainActive => ${(error as Error).message}`);
    return false;
  }
}

export function startSessionClientCleanup(intervalMs = 60000) {
  setInterval(() => {
    const now = Date.now();
    for (const [addr, cached] of sessionClientMap.entries()) {
      if (now - cached.lastAccess > SESSION_CLIENT_TTL_MS) {
        sessionClientMap.delete(addr);
        logger.debug(
          `Session for address=${addr} removed by cleanup due to inactivity.`,
        );
      }
    }
  }, intervalMs);

  logger.info(`SessionClient cleanup runs every ${intervalMs / 1000} seconds.`);
}
