"use client";

import { useMemo, useState } from "react";
import { RITUAL_CHAIN } from "@/lib/chain";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

type Piece = number[][];
const SIZE = 8;
const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(false) as boolean[]);
const pieces: Piece[] = [
  [[1,1,1]], [[1],[1],[1]], [[1,1],[1,1]], [[1,0],[1,0],[1,1]], [[0,1],[0,1],[1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]], [[1,1,1],[0,1,0]], [[1]], [[1,1]]
];

function seededRand(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function makeLevel(level: number) {
  const b = emptyBoard();
  const fill = Math.min(34, 7 + level);
  for (let i = 0; i < fill; i++) {
    const r = Math.floor(seededRand(level * 55 + i) * SIZE);
    const c = Math.floor(seededRand(level * 77 + i) * SIZE);
    b[r][c] = true;
  }
  return b;
}

export default function Page() {
  const [address, setAddress] = useState("");
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<boolean[][]>(() => makeLevel(1));
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [log, setLog] = useState("Connect wallet, clear blocks, win levels, then mint NFT rewards.");
  const currentPieces = useMemo(() => [0, 2, 3].map((i) => pieces[(i + level + moves) % pieces.length]), [level, moves]);
  const target = 90 + level * 8;
  const won = score >= target;

  async function connectWallet() {
    try {
      if (!window.ethereum) throw new Error("Install MetaMask, OKX Wallet, or Rabby first.");
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [RITUAL_CHAIN] });
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      setAddress(accounts[0] || "");
      setLog("Wallet connected on Ritual Testnet.");
    } catch (e) { setLog(e instanceof Error ? e.message : "Wallet connection failed."); }
  }
  function resetLevel(n = level) { setLevel(n); setBoard(makeLevel(n)); setScore(0); setMoves(0); setLog(`Level ${n} started.`); }
  function canPlace(piece: Piece, r: number, c: number) {
    for (let y = 0; y < piece.length; y++) for (let x = 0; x < piece[y].length; x++) if (piece[y][x]) {
      if (r + y >= SIZE || c + x >= SIZE || board[r + y][c + x]) return false;
    }
    return true;
  }
  function clearLines(b: boolean[][]) {
    const rows = b.map((row) => row.every(Boolean));
    const cols = Array.from({ length: SIZE }, (_, c) => b.every((row) => row[c]));
    let cleared = rows.filter(Boolean).length + cols.filter(Boolean).length;
    const nb = b.map((row) => [...row]);
    rows.forEach((v, r) => { if (v) for (let c = 0; c < SIZE; c++) nb[r][c] = false; });
    cols.forEach((v, c) => { if (v) for (let r = 0; r < SIZE; r++) nb[r][c] = false; });
    return { nb, cleared };
  }
  function place(r: number, c: number) {
    if (won) return;
    const p = currentPieces[selected];
    if (!canPlace(p, r, c)) { setLog("Cannot place this block here."); return; }
    const nb = board.map((row) => [...row]);
    let blocks = 0;
    for (let y = 0; y < p.length; y++) for (let x = 0; x < p[y].length; x++) if (p[y][x]) { nb[r+y][c+x] = true; blocks++; }
    const cleared = clearLines(nb);
    const add = blocks * 5 + cleared.cleared * 30;
    const nextScore = score + add;
    setBoard(cleared.nb); setScore(nextScore); setMoves(moves + 1); setSelected((selected + 1) % 3);
    if (nextScore >= target) { setCompleted((prev) => Array.from(new Set([...prev, level]))); setLog(`Level ${level} complete. You can mint your NFT reward.`); }
    else setLog(`+${add} points. Clear rows or columns to finish faster.`);
  }
  async function callApi(path: string, body: object) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function faucet() {
    try { if (!address) throw new Error("Connect wallet first."); const d = await callApi("/api/faucet", { address }); setLog(`Faucet sent 0.01 RITUAL. Tx: ${d.txHash}`); }
    catch(e){ setLog(e instanceof Error ? e.message : "Faucet failed"); }
  }
  async function mint() {
    try { if (!address) throw new Error("Connect wallet first."); if (!won) throw new Error("Win the current level before minting."); const d = await callApi("/api/mint", { address, level }); setLog(`NFT minted for level ${level}. Tx: ${d.txHash}`); }
    catch(e){ setLog(e instanceof Error ? e.message : "Mint failed"); }
  }
  function nextLevel() { resetLevel(Math.min(50, level + 1)); }

  return <main className="page"><div className="shell">
    <div className="top"><div className="brand"><h1>RITUAL BLOCK PUZZLE</h1><p>50 modern levels · faucet · blockchain NFT reward per winning level</p></div><div className="pill">Ritual Testnet · Chain 1979</div></div>
    <div className="grid">
      <section className="panel"><h2>Player</h2><button className="btn" onClick={connectWallet}>{address ? "Wallet Connected" : "Connect Wallet"}</button><p className="wallet">{address || "No wallet connected"}</p><button className="btn good" onClick={faucet}>Faucet 0.01 RITUAL</button><p className="log">One faucet claim per wallet.</p><h2>Stats</h2><div className="stat"><span>Level</span><b>{level}/50</b></div><div className="stat"><span>Score</span><b>{score}/{target}</b></div><div className="stat"><span>Moves</span><b>{moves}</b></div><div className="stat"><span>Completed</span><b>{completed.length}</b></div></section>
      <section className="panel"><div className="boardWrap"><div className="board">{board.map((row,r)=>row.map((v,c)=><button key={`${r}-${c}`} aria-label={`cell ${r} ${c}`} onClick={()=>place(r,c)} className={`cell ${v ? "filled" : ""}`} />))}</div></div><div className="pieces">{currentPieces.map((p,i)=><button key={i} onClick={()=>setSelected(i)} className={`piece ${selected===i ? "active" : ""}`}><div className="mini">{p.map((row,y)=><div className="miniRow" key={y}>{row.map((v,x)=><span key={x} className={`miniCell ${v ? "on" : ""}`} />)}</div>)}</div></button>)}</div><p className="log">{log}</p><button className="btn secondary" onClick={()=>resetLevel()}>Restart Level</button> <button className="btn" disabled={!won || level>=50} onClick={nextLevel}>Next Level</button> <button className="btn warn" disabled={!won} onClick={mint}>Mint Level NFT</button></section>
      <section className="panel"><h2>50 Levels</h2><div className="levelGrid">{Array.from({length:50},(_,i)=>i+1).map(n=><button key={n} onClick={()=>resetLevel(n)} className={`level ${n===level ? "current" : ""} ${completed.includes(n) ? "done" : ""}`}>{n}</button>)}</div><h2 style={{marginTop:18}}>Rules</h2><p className="log">Place blocks on the board. Full rows or columns are cleared. Reach the target score to complete the level. NFT mint is limited to one time per day per wallet by the server route.</p></section>
    </div>
  </div></main>;
}
