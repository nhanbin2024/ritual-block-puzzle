import { ethers } from "ethers";

export const CHAIN_ID_DECIMAL = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1979");
export const CHAIN_ID_HEX = "0x" + CHAIN_ID_DECIMAL.toString(16);
export const RPC_HTTP = process.env.RITUAL_RPC_HTTP || process.env.NEXT_PUBLIC_RITUAL_RPC_HTTP || "https://rpc.ritualfoundation.org";
export const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://explorer.ritualfoundation.org";
export const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "";
export const PRIVATE_KEY = process.env.RITUAL_PRIVATE_KEY || "";

export const RITUAL_CHAIN = {
  chainId: CHAIN_ID_HEX,
  chainName: "Ritual Testnet",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_RITUAL_RPC_HTTP || "https://rpc.ritualfoundation.org"],
  blockExplorerUrls: [EXPLORER]
};

export const LEVEL_NFT_ABI = [
  "function mintLevelNFT(address player,uint256 level) external returns (uint256)",
  "function hasMinted(address player,uint256 level) external view returns (bool)",
  "function owner() external view returns (address)"
];

export function getServerWallet() {
  if (!PRIVATE_KEY || PRIVATE_KEY === "0xYOUR_PRIVATE_KEY") {
    throw new Error("Missing RITUAL_PRIVATE_KEY in Vercel Environment Variables");
  }
  const provider = new ethers.JsonRpcProvider(RPC_HTTP, CHAIN_ID_DECIMAL);
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

export function assertAddress(address: string) {
  if (!ethers.isAddress(address)) throw new Error("Invalid wallet address");
  return ethers.getAddress(address);
}
