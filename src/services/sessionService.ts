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
import { encryptPrivateKey } from "../utils/encryption";

/**
 * createSessionRecord
 * Generates a new private key, encrypts it, and stores in DB.
 * If a record exists, it overwrites it.
 */
export async function createSessionRecord(address: string) {
  const plainPrivateKey = generatePrivateKey();
  const account = privateKeyToAccount(plainPrivateKey);

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

  const encryptedPK = encryptPrivateKey(plainPrivateKey);

  const record = await prisma.sessionKey.upsert({
    where: { address },
    update: {
      privateKey: encryptedPK,
      sessionKeyAddress: account.address,
      sessionConfigJson,
    },
    create: {
      id: crypto.randomUUID(),
      address,
      privateKey: encryptedPK,
      sessionKeyAddress: account.address,
      sessionConfigJson,
    },
  });

  logger.debug(`New session record created for address=${address}.`);
  return record;
}

/**
 * getSessionRecord
 * Retrieves the session record from DB by address.
 */
export async function getSessionRecord(address: string) {
  return prisma.sessionKey.findUnique({
    where: { address },
  });
}

/**
 * deleteSessionRecord
 * Removes the session record from DB. Used if an on-chain check fails.
 */
export async function deleteSessionRecord(address: string) {
  await prisma.sessionKey.deleteMany({
    where: { address },
  });
  logger.debug(`Session record deleted for address=${address}.`);
}
