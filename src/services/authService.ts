// /src/services/authService.ts
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { createSiweMessage, parseSiweMessage } from "viem/siwe";
import { Hex } from "viem";
import { CONFIG } from "../config";
import { prisma } from "../clients/prismaClient";
import { publicClient } from "../clients/publicClient";

/**
 * requestSiweMessageService
 * Creates a SIWE message (with a fresh nonce). Ensures only one valid nonce at a time.
 */
export async function requestSiweMessageService(
  address: string,
): Promise<string> {
  await prisma.authChallenge.deleteMany({
    where: { address },
  });

  const nonce = randomBytes(16).toString("hex");
  const siweMsg = createSiweMessage({
    address: address as `0x${string}`,
    domain: CONFIG.siweDomain,
    statement: CONFIG.siweStatement,
    uri: CONFIG.siweUri,
    version: "1",
    chainId: CONFIG.siweChainId,
    nonce,
  });

  // 5-minute expiration
  const expiresAt = new Date(Date.now() + CONFIG.nonceExpiryMs);

  await prisma.authChallenge.create({
    data: {
      address,
      siweMessage: siweMsg,
      nonce,
      expiresAt,
    },
  });

  return siweMsg;
}

/**
 * verifySiweSignatureService
 * Verifies the SIWE signature and returns a JWT if successful.
 */
export async function verifySiweSignatureService(
  address: string,
  signature: string,
): Promise<string> {
  const record = await prisma.authChallenge.findFirst({
    where: { address },
  });
  if (!record) {
    throw new Error("No SIWE record found for this address");
  }

  if (new Date() > record.expiresAt) {
    await prisma.authChallenge.delete({ where: { id: record.id } });
    throw new Error("Nonce has expired");
  }

  const { siweMessage, nonce } = record;
  const parsed = parseSiweMessage(siweMessage);

  if (!parsed.address || parsed.address.toLowerCase() !== address) {
    throw new Error("Address mismatch in SIWE verification");
  }
  if (!parsed.nonce || parsed.nonce !== nonce) {
    throw new Error("Nonce mismatch in SIWE verification");
  }

  // Throws if invalid
  await publicClient.verifySiweMessage({
    message: siweMessage,
    signature: signature as Hex,
  });

  // Delete used record
  await prisma.authChallenge.delete({
    where: { id: record.id },
  });

  let user = await prisma.user.findUnique({
    where: { address },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { address },
    });
  }

  // Issue a JWT (1-day expiration)
  const token = jwt.sign({ address }, CONFIG.jwtSecret, {
    expiresIn: "1d",
  });

  return token;
}
