// /src/services/sessionService.ts
import crypto from "crypto";
import { prisma } from "../clients/prismaClient";
import { logger } from "../utils/logger";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  SessionConfig,
  LimitType,
} from "@abstract-foundation/agw-client/sessions";
import { parseEther, toFunctionSelector } from "viem";
import { getSessionStatus } from "@abstract-foundation/agw-client/actions";
import { publicClient } from "../clients/publicClient";

export enum SessionStatus {
  NotInitialized = 0,
  Active = 1,
  Closed = 2,
  Expired = 3,
}

/**
 * fetchAndSyncSession
 * 1) Load session from DB by address.
 * 2) If no record => return null.
 * 3) If status is "pending" or "active", check on-chain to keep DB in sync.
 * 4) If on-chain says "expired" or "closed", mark DB as "revoked" and return the updated record.
 * 5) Return the final record from DB.
 */
export async function fetchAndSyncSession(address: string) {
  const lowerAddress = address.toLowerCase();

  let record = await prisma.sessionKey.findUnique({
    where: { address: lowerAddress },
  });
  if (!record) {
    return null;
  }

  if (record.status === "pending" || record.status === "active") {
    try {
      const sessionConfig = JSON.parse(
        record.sessionConfigJson,
      ) as SessionConfig;
      const statusOnChain = (await getSessionStatus(
        publicClient,
        address as `0x${string}`,
        sessionConfig,
      )) as SessionStatus;

      switch (statusOnChain) {
        case SessionStatus.Active:
          // If on-chain is truly active, we can choose to keep DB as pending
          // until user calls confirmSession, or auto-promote it. We do not override here.
          break;
        case SessionStatus.Closed:
        case SessionStatus.Expired:
        case SessionStatus.NotInitialized:
          await prisma.sessionKey.update({
            where: { address: lowerAddress },
            data: { status: "revoked" },
          });
          record = { ...record, status: "revoked" };
          logger.info(
            `Session for address=${address} on-chain status=${statusOnChain}, set DB to revoked.`,
          );
          break;
      }
    } catch (err) {
      logger.error(
        `fetchAndSyncSession => error checking on-chain: ${
          (err as Error).message
        }`,
      );
    }
  }

  return record;
}

/**
 * createOrGetSessionKey
 * 1) fetchAndSyncSession -> ensures DB is up to date with on-chain.
 * 2) If the session is "active", return it.
 * 3) If missing or "revoked", generate a new session => "pending".
 */
export async function createOrGetSessionKey(address: string): Promise<{
  status: string;
  sessionKeyAddress?: string;
  sessionConfig?: SessionConfig;
}> {
  const lowerAddress = address.toLowerCase();
  let record = await fetchAndSyncSession(address);

  if (record) {
    if (record.status === "active") {
      const sessionConfig = JSON.parse(
        record.sessionConfigJson,
      ) as SessionConfig;
      return {
        status: "active",
        sessionKeyAddress: record.sessionKeyAddress,
        sessionConfig,
      };
    }

    if (record.status === "pending") {
      const sessionConfig = JSON.parse(
        record.sessionConfigJson,
      ) as SessionConfig;
      return {
        status: "pending",
        sessionKeyAddress: record.sessionKeyAddress,
        sessionConfig,
      };
    }
  }

  // If no session or it's revoked => create a new "pending" session
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24); // 24h
  const sessionConfig: SessionConfig = {
    signer: account.address,
    expiresAt,
    feeLimit: {
      limitType: LimitType.Lifetime,
      limit: parseEther("1"),
      period: 0n,
    },
    callPolicies: [
      {
        target: "0xC4822AbB9F05646A9Ce44EFa6dDcda0Bf45595AA",
        selector: toFunctionSelector("mint(address,uint256)"),
        valueLimit: {
          limitType: LimitType.Unlimited,
          limit: 0n,
          period: 0n,
        },
        maxValuePerUse: 0n,
        constraints: [],
      },
    ],
    transferPolicies: [],
  };

  const sessionConfigJson = JSON.stringify({
    ...sessionConfig,
    expiresAt: sessionConfig.expiresAt.toString(),
    feeLimit: {
      ...sessionConfig.feeLimit,
      limit: sessionConfig.feeLimit.limit.toString(),
      period: sessionConfig.feeLimit.period.toString(),
    },
    callPolicies: sessionConfig.callPolicies.map((policy) => ({
      ...policy,
      valueLimit: {
        ...policy.valueLimit,
        limit: policy.valueLimit.limit.toString(),
        period: policy.valueLimit.period.toString(),
      },
      maxValuePerUse: policy.maxValuePerUse.toString(),
      constraints: policy.constraints,
    })),
    transferPolicies: sessionConfig.transferPolicies,
  });

  await prisma.sessionKey.upsert({
    where: { address: lowerAddress },
    update: {
      privateKey,
      sessionKeyAddress: account.address,
      sessionConfigJson,
      status: "pending",
    },
    create: {
      id: crypto.randomUUID(),
      address: lowerAddress,
      privateKey,
      sessionKeyAddress: account.address,
      sessionConfigJson,
      status: "pending",
    },
  });

  return {
    status: "pending",
    sessionKeyAddress: account.address,
    sessionConfig,
  };
}

/**
 * confirmSession
 * Once the on-chain createSession is done, verify status => if active => mark DB active, else => revoked.
 */
export async function confirmSession(address: string): Promise<void> {
  const lowerAddress = address.toLowerCase();
  const record = await prisma.sessionKey.findUnique({
    where: { address: lowerAddress },
  });
  if (!record || record.status !== "pending") {
    throw new Error("No pending session found for user");
  }

  const sessionConfig = JSON.parse(record.sessionConfigJson) as SessionConfig;
  const statusOnChain = (await getSessionStatus(
    publicClient,
    address.toLowerCase() as `0x${string}`,
    sessionConfig,
  )) as SessionStatus;

  if (statusOnChain === SessionStatus.Active) {
    await prisma.sessionKey.update({
      where: { address: lowerAddress },
      data: { status: "active" },
    });
  } else {
    await prisma.sessionKey.update({
      where: { address: lowerAddress },
      data: { status: "revoked" },
    });
  }
}

/**
 * getSession
 * Simple DB lookup. Optionally, you could do an on-chain check each time.
 */
export async function getSession(address: string) {
  const lowerAddress = address.toLowerCase();
  return prisma.sessionKey.findUnique({
    where: { address: lowerAddress },
  });
}
