import { NextRequest, NextResponse } from "next/server";
import { Contract } from "ethers";
import { assertAddress, getServerWallet, LEVEL_NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/chain";
import { checkOncePerDay } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { address, level } = await req.json();
    const player = assertAddress(String(address || ""));
    const levelNumber = Number(level);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 50) throw new Error("Invalid level");
    if (!NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS === "0xYOUR_DEPLOYED_CONTRACT") throw new Error("Missing NFT_CONTRACT_ADDRESS in Vercel Environment Variables");
    const allowed = await checkOncePerDay(`mint:${player.toLowerCase()}`);
    if (!allowed) return NextResponse.json({ ok: false, error: "This wallet can mint only once per day." }, { status: 429 });
    const wallet = getServerWallet();
    const contract = new Contract(NFT_CONTRACT_ADDRESS, LEVEL_NFT_ABI, wallet);
    const already = await contract.hasMinted(player, levelNumber);
    if (already) return NextResponse.json({ ok: false, error: "This wallet already minted this level." }, { status: 409 });
    const tx = await contract.mintLevelNFT(player, levelNumber);
    await tx.wait(1);
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Mint failed" }, { status: 400 });
  }
}
