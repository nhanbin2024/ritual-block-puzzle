# Ritual Block Puzzle

Modern 50-level block puzzle game with Ritual Testnet wallet connection, faucet, and NFT mint reward.

## Local run

```bash
npm install
npm run dev
```

## Vercel Environment Variables

```env
RITUAL_RPC_HTTP=https://rpc.ritualfoundation.org
RITUAL_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
NFT_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
NEXT_PUBLIC_CHAIN_ID=1979
NEXT_PUBLIC_RITUAL_RPC_HTTP=https://rpc.ritualfoundation.org
NEXT_PUBLIC_EXPLORER=https://explorer.ritualfoundation.org
```

Never commit `.env` or private keys to GitHub.

## Contract

Deploy `contracts/RitualLevelNFT.sol` on Ritual Testnet using Remix. The wallet from `RITUAL_PRIVATE_KEY` must be the contract owner so the server can mint NFTs.
