import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";

const mintedToday = new Map<string, string>();

const ABI = [
  "function mintLevelNFT(address player, uint256 level) external returns (uint256)",
];

export async function POST(req: Request) {
  try {
    const { address, level } = await req.json();

    if (!ethers.isAddress(address)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address" });
    }

    if (!level || level < 1 || level > 50) {
      return NextResponse.json({ success: false, error: "Invalid level" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const key = `${address.toLowerCase()}:${today}`;

    if (mintedToday.has(key)) {
      return NextResponse.json({
        success: false,
        error: "NFT already minted today for this wallet",
      });
    }

    const rpc = process.env.RITUAL_RPC_HTTP!;
    const privateKey = process.env.RITUAL_PRIVATE_KEY!;
    const contractAddress = process.env.NFT_CONTRACT_ADDRESS!;

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ABI, wallet);

    const tx = await contract.mintLevelNFT(address, level);
    await tx.wait();

    mintedToday.set(key, tx.hash);

    return NextResponse.json({
      success: true,
      message: `Level ${level} NFT minted successfully`,
      txHash: tx.hash,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.shortMessage || err?.message || "Mint failed",
    });
  }
}