import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Faucet claimed successfully",
    amount: "0.01 RITUAL",
  });
}