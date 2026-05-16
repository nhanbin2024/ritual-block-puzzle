import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";

const claimed = new Map<string, string>();

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${address.toLowerCase()}:${today}`;

    if (claimed.has(key)) {
      return NextResponse.json({
        success: false,
        error: "Faucet already claimed today",
      });
    }

    const rpc = process.env.RITUAL_RPC_HTTP!;
    const privateKey = process.env.RITUAL_PRIVATE_KEY!;

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther("0.01"),
    });

    await tx.wait();

    claimed.set(key, tx.hash);

    return NextResponse.json({
      success: true,
      message: "Faucet sent 0.01 RITUAL successfully",
      txHash: tx.hash,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || "Faucet failed",
    });
  }
}