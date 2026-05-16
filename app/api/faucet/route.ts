import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { assertAddress, getServerWallet } from "@/lib/chain";
import { checkOnceEver } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    const to = assertAddress(String(address || ""));
    const allowed = await checkOnceEver(`faucet:${to.toLowerCase()}`);
    if (!allowed) return NextResponse.json({ ok: false, error: "This wallet already used the faucet." }, { status: 429 });
    const wallet = getServerWallet();
    const tx = await wallet.sendTransaction({ to, value: ethers.parseEther("0.01") });
    await tx.wait(1);
    return NextResponse.json({ ok: true, txHash: tx.hash });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Faucet failed" }, { status: 400 });
  }
}
