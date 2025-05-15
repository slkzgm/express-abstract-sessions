// /src/services/mintService.ts
import type { SessionClient } from "@abstract-foundation/agw-client/sessions";
import { parseAbi } from "viem";
import { CONFIG } from "../config";

const NFT_CONTRACT_ADDRESS = "0xC4822AbB9F05646A9Ce44EFa6dDcda0Bf45595AA";

const nftAbi = parseAbi([
  "function mint(address to, uint256 amount) external returns (bool)",
]);

export async function mintNFT(
  sessionClient: SessionClient,
  to: string,
  amount: bigint,
): Promise<string> {
  const txHash = await sessionClient.writeContract({
    chain: CONFIG.chain,
    account: sessionClient.account,
    address: NFT_CONTRACT_ADDRESS as `0x${string}`,
    abi: nftAbi,
    functionName: "mint",
    args: [to as `0x${string}`, amount],
  });

  return txHash;
}
