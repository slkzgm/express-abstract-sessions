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
 * Creates a SIWE message with a fresh nonce. Ensures only one valid nonce at a time.
 */
export async function requestSiweMessageService(
  address: string,
): Promise<string> {
  const lowerAddr = address.toLowerCase();

  await prisma.authChallenge.deleteMany({
    where: { address: lowerAddr },
  });

  // Generate a random nonce
  const nonce = randomBytes(16).toString("hex");

  // Build a SIWE message
  const siweMsg = createSiweMessage({
    address: lowerAddr as `0x${string}`,
    domain: CONFIG.siweDomain,
    statement: CONFIG.siweStatement,
    uri: CONFIG.siweUri,
    version: "1",
    chainId: CONFIG.siweChainId,
    nonce,
  });

  // We set a 5-minute expiration for this authChallenge
  const expiresAt = new Date(Date.now() + CONFIG.nonceExpiryMs);

  await prisma.authChallenge.create({
    data: {
      address: lowerAddr,
      siweMessage: siweMsg,
      nonce,
      expiresAt,
    },
  });

  return siweMsg;
}

/**
 * verifySiweSignatureService
 * - Loads the SIWE record
 * - Checks expiration
 * - Verifies the signature using `viem`
 * - Deletes the used record (preventing replay)
 * - Creates/gets the user if needed
 * - Returns a JWT
 */
export async function verifySiweSignatureService(
  address: string,
  signature: string,
): Promise<string> {
  const lowerAddr = address.toLowerCase();

  const record = await prisma.authChallenge.findFirst({
    where: { address: lowerAddr },
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

  if (!parsed.address || parsed.address.toLowerCase() !== lowerAddr) {
    throw new Error("Address mismatch in SIWE verification");
  }
  if (!parsed.nonce || parsed.nonce !== nonce) {
    throw new Error("Nonce mismatch in SIWE verification");
  }

  // This will throw if signature is invalid
  await publicClient.verifySiweMessage({
    message: siweMessage,
    signature: signature as Hex,
  });

  // Delete the nonce record to prevent replay attacks
  await prisma.authChallenge.delete({
    where: { id: record.id },
  });

  let user = await prisma.user.findUnique({
    where: { address: lowerAddr },
  });
  if (!user) {
    user = await prisma.user.create({
      data: { address: lowerAddr },
    });
  }

  // Return a signed JWT (example: 1 day expiration)
  const token = jwt.sign({ address: lowerAddr }, CONFIG.jwtSecret, {
    expiresIn: "1d",
  });

  return token;
}
