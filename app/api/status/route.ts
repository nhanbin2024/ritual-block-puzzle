import { NextResponse } from "next/server";
import { CHAIN_ID_DECIMAL, NFT_CONTRACT_ADDRESS, RPC_HTTP } from "@/lib/chain";
export async function GET() {
  return NextResponse.json({ ok: true, chainId: CHAIN_ID_DECIMAL, rpc: RPC_HTTP, nftContract: NFT_CONTRACT_ADDRESS || null });
}
