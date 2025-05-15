// /src/config/index.ts
import dotenv from "dotenv";
import { abstract, abstractTestnet } from "viem/chains";
import { Chain } from "viem";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

export const CONFIG = {
  isProd,
  port: process.env.PORT || 3000,

  clientOrigin: isProd ? [] : "http://localhost:3001",
  jwtSecret: process.env.JWT_SECRET || "placeholder_jwt_secret",

  databaseUrl: process.env.DATABASE_URL || "",

  chain: (process.env.CHAIN === "mainnet"
    ? abstract
    : abstractTestnet) as Chain,

  siweDomain: process.env.SIWE_DOMAIN || "yourapp.io",
  siweStatement: process.env.SIWE_STATEMENT || "Sign in with Ethereum",
  siweUri: process.env.SIWE_URI || "https://yourapp.io",
  siweChainId: Number(process.env.SIWE_CHAIN_ID) || 1,
  nonceExpiryMs: Number(process.env.NONCE_EXPIRY_MS) || 300_000, // 5min default
};
