"use client";

import { useMemo, useState } from "react";

type Cell = 0 | 1;
type Piece = number[][];

const BOARD_SIZE = 8;

const PIECES: Piece[] = [
  [[1, 1], [1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as Cell)
  );
}

function seededBoard(level: number): Cell[][] {
  const board = emptyBoard();
  const count = Math.min(6 + level, 22);

  for (let i = 0; i < count; i++) {
    const r = (i * 3 + level * 2) % BOARD_SIZE;
    const c = (i * 5 + level) % BOARD_SIZE;
    board[r][c] = 1;
  }

  return board;
}

function makePieces(level: number): Piece[] {
  return [0, 1, 2].map((i) => PIECES[(level + i * 3) % PIECES.length]);
}

function canPlace(board: Cell[][], piece: Piece, row: number, col: number) {
  for (let r = 0; r < piece.length; r++) {
    for (let c = 0; c < piece[r].length; c++) {
      if (!piece[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (br < 0 || bc < 0 || br >= BOARD_SIZE || bc >= BOARD_SIZE) return false;
      if (board[br][bc]) return false;
    }
  }
  return true;
}

function placePiece(board: Cell[][], piece: Piece, row: number, col: number) {
  const next = board.map((r) => [...r]) as Cell[][];

  for (let r = 0; r < piece.length; r++) {
    for (let c = 0; c < piece[r].length; c++) {
      if (piece[r][c]) next[row + r][col + c] = 1;
    }
  }

  let cleared = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (next[r].every(Boolean)) {
      next[r] = Array.from({ length: BOARD_SIZE }, () => 0 as Cell);
      cleared++;
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (!next[r][c]) full = false;
    }

    if (full) {
      for (let r = 0; r < BOARD_SIZE; r++) next[r][c] = 0;
      cleared++;
    }
  }

  return { board: next, cleared };
}

export default function Home() {
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Cell[][]>(() => seededBoard(1));
  const [pieces, setPieces] = useState<Piece[]>(() => makePieces(1));
  const [selected, setSelected] = useState(0);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("Level 1 started.");
  const [faucetClaimed, setFaucetClaimed] = useState(false);
  const [mintedToday, setMintedToday] = useState(false);

  const targetScore = useMemo(() => level * 80 + 18, [level]);
  const levelDone = score >= targetScore;

  async function connectWallet() {
    const eth = (window as any).ethereum;

    if (!eth) {
      setMessage("Please install MetaMask, OKX Wallet, or Rabby.");
      return;
    }

    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);

      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x7bb" }],
        });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x7bb",
              chainName: "Ritual Testnet",
              nativeCurrency: {
                name: "RITUAL",
                symbol: "RITUAL",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.ritualfoundation.org"],
              blockExplorerUrls: ["https://explorer.ritualfoundation.org"],
            },
          ],
        });
      }

      setMessage("Wallet connected.");
    } catch {
      setMessage("Wallet connection failed.");
    }
  }

  async function claimFaucet() {
    if (!wallet) {
      setMessage("Connect wallet first.");
      return;
    }

    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet }),
      });

      const data = await res.json();

      if (data.success) {
        setFaucetClaimed(true);
        setMessage(data.message || "Faucet claimed: 0.01 RITUAL.");
      } else {
        setMessage(data.error || "Faucet failed.");
      }
    } catch {
      setMessage("Faucet API error.");
    }
  }

  async function mintNFT() {
    if (!wallet) {
      setMessage("Connect wallet first.");
      return;
    }

    if (!levelDone) {
      setMessage("Complete this level before minting NFT.");
      return;
    }

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet, level }),
      });

      const data = await res.json();

      if (data.success) {
        setMintedToday(true);
        setCompleted((v) => Math.max(v, level));
        setMessage(data.message || `Level ${level} NFT minted.`);
      } else {
        setMessage(data.error || "Mint failed.");
      }
    } catch {
      setMessage("Mint API error.");
    }
  }

  function restartLevel(nextLevel = level) {
    setLevel(nextLevel);
    setBoard(seededBoard(nextLevel));
    setPieces(makePieces(nextLevel));
    setSelected(0);
    setScore(0);
    setMoves(0);
    setMintedToday(false);
    setMessage(`Level ${nextLevel} started.`);
  }

  function handleCellClick(row: number, col: number) {
    const piece = pieces[selected];
    if (!piece) return;

    if (!canPlace(board, piece, row, col)) {
      setMessage("Cannot place block here.");
      return;
    }

    const result = placePiece(board, piece, row, col);
    const gain = piece.flat().filter(Boolean).length * 10 + result.cleared * 50;

    const nextPieces = pieces.map((p, i) => (i === selected ? [] : p));
    const allUsed = nextPieces.every((p) => p.length === 0);

    setBoard(result.board);
    setPieces(allUsed ? makePieces(level + moves + 1) : nextPieces);
    setScore((s) => s + gain);
    setMoves((m) => m + 1);
    setMessage(result.cleared ? `Great! Cleared ${result.cleared} line(s).` : "Block placed.");
  }

  function goNextLevel() {
    if (!levelDone) {
      setMessage("Reach target score first.");
      return;
    }

    const next = Math.min(level + 1, 50);
    setCompleted((v) => Math.max(v, level));
    restartLevel(next);
  }

  return (
    <main className="min-h-screen bg-[#100b2d] text-white px-8 py-7">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-wide">RITUAL BLOCK PUZZLE</h1>
            <p className="mt-2 text-indigo-100">
              50 modern levels · faucet · blockchain NFT reward per winning level
            </p>
          </div>

          <div className="rounded-full border border-cyan-300/30 bg-white/10 px-5 py-3">
            Ritual Testnet · Chain 1979
          </div>
        </header>

        <section className="grid grid-cols-[300px_1fr_310px] gap-5">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Player</h2>

            <button
              onClick={connectWallet}
              className="mt-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-black"
            >
              {wallet ? "Wallet Connected" : "Connect Wallet"}
            </button>

            <p className="mt-4 break-all text-xs text-indigo-100">
              {wallet || "No wallet connected"}
            </p>

            <button
              onClick={claimFaucet}
              className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 font-black"
            >
              {faucetClaimed ? "Faucet Claimed" : "Faucet 0.01 RITUAL"}
            </button>

            <p className="mt-3 text-sm text-indigo-100">
              One faucet claim per wallet.
            </p>

            <div className="mt-14">
              <h2 className="text-lg font-bold">Stats</h2>

              <div className="mt-5 space-y-3 text-indigo-100">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span>Level</span>
                  <b>{level}/50</b>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span>Score</span>
                  <b>{score}/{targetScore}</b>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span>Moves</span>
                  <b>{moves}</b>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span>Completed</span>
                  <b>{completed}</b>
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mx-auto grid w-fit grid-cols-8 gap-2 rounded-3xl border border-cyan-300/20 bg-slate-900/70 p-5">
              {board.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`h-12 w-12 rounded-xl border border-white/10 transition hover:border-cyan-300 ${
                      cell
                        ? "bg-gradient-to-br from-cyan-300 to-fuchsia-500 shadow-[0_0_18px_rgba(34,211,238,.8)]"
                        : "bg-white/8"
                    }`}
                  />
                ))
              )}
            </div>

            <div className="mt-5 flex justify-center gap-4">
              {pieces.map((piece, index) => (
                <button
                  key={index}
                  onClick={() => setSelected(index)}
                  className={`min-h-[90px] min-w-[90px] rounded-2xl border p-3 ${
                    selected === index
                      ? "border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.7)]"
                      : "border-white/10"
                  }`}
                >
                  {piece.length > 0 ? (
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${piece[0].length}, 16px)`,
                      }}
                    >
                      {piece.flatMap((row, r) =>
                        row.map((cell, c) => (
                          <span
                            key={`${r}-${c}`}
                            className={`h-4 w-4 rounded ${
                              cell
                                ? "bg-gradient-to-br from-yellow-300 to-fuchsia-500 shadow-[0_0_10px_rgba(236,72,153,.8)]"
                                : "bg-white/10"
                            }`}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-white/40">Used</span>
                  )}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm text-indigo-100">{message}</p>

            <div className="mt-14 flex gap-3">
              <button
                onClick={() => restartLevel(level)}
                className="rounded-2xl bg-white/15 px-5 py-3 font-black"
              >
                Restart Level
              </button>

              <button
                onClick={goNextLevel}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-black"
              >
                Next Level
              </button>

              <button
                onClick={mintNFT}
                className="rounded-2xl bg-gradient-to-r from-yellow-500 to-pink-500 px-5 py-3 font-black"
              >
                {mintedToday ? "Minted Today" : "Mint Level NFT"}
              </button>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-black">50 Levels</h2>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => restartLevel(n)}
                  className={`rounded-xl border px-3 py-3 font-bold ${
                    n === level
                      ? "border-cyan-300 bg-cyan-400 text-slate-950"
                      : "border-white/10 bg-white/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-black">Rules</h2>
              <p className="mt-4 text-sm leading-6 text-indigo-100">
                Place blocks on the board. Full rows or columns are cleared.
                Reach the target score to complete the level. NFT mint is
                limited to one time per day per wallet by the server route.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}