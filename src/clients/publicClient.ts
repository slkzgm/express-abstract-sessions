// /src/clients/publicClient.ts
import { createPublicClient, http } from "viem";
import { CONFIG } from "../config";

export const publicClient = createPublicClient({
  chain: CONFIG.chain,
  transport: http(),
});
