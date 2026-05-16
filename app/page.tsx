"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 10;
const HEIGHT = 20;
const BLOCK = 32;
const MAX_LEVEL = 50;

const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];

type Piece = {
  x: number;
  y: number;
  shape: number[][];
};

function emptyBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
}

function randomPiece(): Piece {
  return {
    x: 3,
    y: 0,
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
  };
}

function rotateShape(shape: number[][]) {
  return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
}

function shortAddress(address: string) {
  if (!address) return "No wallet connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Page() {
  const [board, setBoard] = useState<number[][]>(() => emptyBoard());
  const [piece, setPiece] = useState<Piece>(() => randomPiece());
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("Level 1 started.");
  const [faucetClaimed, setFaucetClaimed] = useState(false);
  const [mintedToday, setMintedToday] = useState(false);
  const [paused, setPaused] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const pausedRef = useRef(paused);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const targetScore = useMemo(() => level * 500, [level]);
  const dropMs = useMemo(() => Math.max(120, 720 - level * 12), [level]);
  const levelDone = score >= targetScore;

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    pieceRef.current = piece;
  }, [piece]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  function collide(px: number, py: number, shape: number[][], b = boardRef.current) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;

        const nx = px + x;
        const ny = py + y;

        if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return true;
        if (ny >= 0 && b[ny][nx]) return true;
      }
    }

    return false;
  }

  function mergePiece(currentPiece = pieceRef.current, currentBoard = boardRef.current) {
    const next = currentBoard.map((row) => [...row]);

    currentPiece.shape.forEach((row, y) => {
      row.forEach((v, x) => {
        if (!v) return;

        const by = currentPiece.y + y;
        const bx = currentPiece.x + x;

        if (by >= 0 && by < HEIGHT && bx >= 0 && bx < WIDTH) {
          next[by][bx] = 1;
        }
      });
    });

    let cleared = 0;

    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (next[y].every(Boolean)) {
        next.splice(y, 1);
        next.unshift(Array(WIDTH).fill(0));
        cleared++;
        y++;
      }
    }

    setScore((s) => s + 20 + cleared * 200);
    setLines((l) => l + cleared);
    setBoard(next);

    const newPiece = randomPiece();

    if (collide(newPiece.x, newPiece.y, newPiece.shape, next)) {
      setMessage("Game over. Restart level.");
      setPaused(true);
      return;
    }

    setPiece(newPiece);
    setMessage(cleared ? `Great! Cleared ${cleared} line(s).` : "Piece locked.");
  }

  function move(dx: number, dy: number) {
    if (pausedRef.current) return;

    const p = pieceRef.current;

    if (!collide(p.x + dx, p.y + dy, p.shape)) {
      setPiece({ ...p, x: p.x + dx, y: p.y + dy });
      return;
    }

    if (dy > 0) mergePiece(p);
  }

  function rotate() {
    if (pausedRef.current) return;

    const p = pieceRef.current;
    const rotated = rotateShape(p.shape);

    if (!collide(p.x, p.y, rotated)) {
      setPiece({ ...p, shape: rotated });
    }
  }

  function hardDrop() {
    if (pausedRef.current) return;

    const p = { ...pieceRef.current };

    while (!collide(p.x, p.y + 1, p.shape)) {
      p.y++;
    }

    setPiece(p);
    mergePiece(p);
  }

  function restartLevel(nextLevel = level) {
    setBoard(emptyBoard());
    setPiece(randomPiece());
    setLevel(nextLevel);
    setScore(0);
    setLines(0);
    setMintedToday(false);
    setPaused(false);
    setMessage(`Level ${nextLevel} started.`);
  }

  function nextLevel() {
    if (!levelDone) {
      setMessage("Reach target score first.");
      return;
    }

    setCompleted((v) => Math.max(v, level));
    restartLevel(Math.min(level + 1, MAX_LEVEL));
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicOn) {
      audio.pause();
      setMusicOn(false);
    } else {
      audio.volume = 0.45;
      audio.play();
      setMusicOn(true);
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      move(0, 1);
    }, dropMs);

    return () => clearInterval(id);
  }, [dropMs]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      const k = e.key.toLowerCase();

      if (
        [
          "arrowleft",
          "arrowright",
          "arrowdown",
          "arrowup",
          " ",
          "a",
          "d",
          "s",
          "w",
        ].includes(k)
      ) {
        e.preventDefault();
      }

      if (k === "arrowleft" || k === "a") move(-1, 0);
      if (k === "arrowright" || k === "d") move(1, 0);
      if (k === "arrowdown" || k === "s") move(0, 1);
      if (k === "arrowup" || k === "w") rotate();
      if (k === " ") hardDrop();
      if (k === "p") setPaused((v) => !v);
    }

    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

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

      setMessage("Wallet connected to Ritual Testnet.");
    } catch {
      setMessage("Wallet connection failed.");
    }
  }

  async function faucet() {
    if (!wallet) {
      setMessage("Connect wallet first.");
      return;
    }

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

    const res = await fetch("/api/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet, level }),
    });

    const data = await res.json();

    if (data.success) {
      setMintedToday(true);
      setCompleted((v) => Math.max(v, level));
      setMessage(data.message || `Level ${level} NFT minted successfully.`);
    } else {
      setMessage(data.error || "Mint failed.");
    }
  }

  function visibleBoard() {
    const display = board.map((row) => [...row]);

    piece.shape.forEach((row, y) => {
      row.forEach((v, x) => {
        if (!v) return;

        const by = piece.y + y;
        const bx = piece.x + x;

        if (by >= 0 && by < HEIGHT && bx >= 0 && bx < WIDTH) {
          display[by][bx] = 2;
        }
      });
    });

    return display;
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-cover bg-center bg-fixed px-6 py-6 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(7,3,29,.72), rgba(7,3,29,.9)), url('/assets/tetris-bg.png')",
      }}
    >
      <audio ref={audioRef} src="/assets/hold-on-tight.mp3" loop />

      <div className="mx-auto max-w-[1680px]">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-[0.08em] drop-shadow-[0_0_18px_rgba(34,211,238,.35)]">
              RITUAL BLOCK PUZZLE
            </h1>
            <p className="mt-2 text-lg text-cyan-100">
              Auto-falling Tetris · 50 levels · faucet · blockchain NFT reward
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMusic}
              className="rounded-full border border-pink-300/40 bg-pink-500/20 px-6 py-3 text-lg font-black"
            >
              {musicOn ? "Music ON" : "Play Music"}
            </button>

            <div className="rounded-full border border-cyan-300/40 bg-white/10 px-6 py-3 text-lg">
              Ritual Testnet · Chain 1979
            </div>
          </div>
        </header>

        <section className="grid grid-cols-[320px_1fr_360px] gap-6">
          <aside className="rounded-3xl border border-white/10 bg-[#08051f]/80 p-6 backdrop-blur-md">
            <h2 className="text-2xl font-black">PLAYER</h2>

            <button
              onClick={connectWallet}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-4 text-xl font-black"
            >
              {wallet ? "Wallet Connected" : "Connect Wallet"}
            </button>

            <p className="mt-4 break-all text-sm text-cyan-100">
              {shortAddress(wallet)}
            </p>

            <button
              onClick={faucet}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-4 text-xl font-black"
            >
              {faucetClaimed ? "Faucet Claimed" : "Faucet 0.01 RITUAL"}
            </button>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black">LEVEL STATS</h3>

              <div className="mt-4 space-y-3 text-lg">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Level</span>
                  <b>{level}/50</b>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Score</span>
                  <b>
                    {score}/{targetScore}
                  </b>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Lines</span>
                  <b>{lines}</b>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span>Completed</span>
                  <b>{completed}</b>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black">CONTROLS</h3>

              <p className="mt-3 leading-8 text-cyan-100">
                A / D or ← / →: Move
                <br />
                S or ↓: Fast drop
                <br />
                W or ↑: Rotate
                <br />
                Space: Hard drop
                <br />
                P: Pause
              </p>
            </div>
          </aside>

          <section className="rounded-3xl border border-cyan-300/20 bg-[#08051f]/78 p-6 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black">LEVEL {level}</h2>
                <p className="text-cyan-100">
                  Speed: {dropMs}ms · Target: {targetScore}
                </p>
              </div>

              <button
                onClick={() => setPaused((v) => !v)}
                className="rounded-2xl bg-white/10 px-6 py-3 font-black"
              >
                {paused ? "Resume" : "Pause"}
              </button>
            </div>

            <div className="flex justify-center">
              <div
                className="grid gap-[3px] rounded-3xl border border-cyan-300/30 bg-[#120d34]/90 p-5 shadow-[0_0_35px_rgba(34,211,238,.25)]"
                style={{
                  gridTemplateColumns: `repeat(${WIDTH}, ${BLOCK}px)`,
                }}
              >
                {visibleBoard().map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`rounded-lg border border-white/10 ${
                        cell
                          ? "bg-gradient-to-br from-cyan-300 via-blue-400 to-fuchsia-500 shadow-[0_0_18px_rgba(34,211,238,.9)]"
                          : "bg-[#1a163f]/90"
                      }`}
                      style={{ width: BLOCK, height: BLOCK }}
                    />
                  ))
                )}
              </div>
            </div>

            <p className="mt-5 text-center text-lg text-cyan-100">{message}</p>

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => restartLevel(level)}
                className="rounded-2xl bg-white/15 px-7 py-4 text-lg font-black"
              >
                Restart Level
              </button>

              <button
                onClick={nextLevel}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-4 text-lg font-black"
              >
                Next Level
              </button>

              <button
                onClick={mintNFT}
                className="rounded-2xl bg-gradient-to-r from-yellow-400 to-pink-500 px-7 py-4 text-lg font-black"
              >
                {mintedToday ? "Minted Today" : "Mint Level NFT"}
              </button>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-[#08051f]/80 p-6 backdrop-blur-md">
            <h2 className="text-2xl font-black">PROJECT INFO</h2>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black text-cyan-200">Wallet</h3>

              <p className="mt-2 break-all text-sm text-white/80">
                {wallet || "Not connected"}
              </p>

              <p className="mt-3 text-emerald-300">
                {wallet ? "● Connected" : "● Disconnected"}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black text-cyan-200">Blockchain</h3>

              <p className="mt-2">Network: Ritual Testnet</p>
              <p>Chain ID: 1979</p>
              <p>Faucet: 0.01 RITUAL / wallet</p>
              <p>NFT mint: 1 time / day / wallet</p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black text-cyan-200">50 Levels</h3>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => restartLevel(n)}
                    className={`rounded-xl border px-3 py-3 font-black ${
                      n === level
                        ? "border-cyan-300 bg-cyan-400 text-slate-950"
                        : "border-white/10 bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-xl font-black text-cyan-200">Rules</h3>

              <p className="mt-3 leading-7 text-white/80">
                Blocks fall automatically like Tetris. Clear full rows to earn
                score. Reach the target score to unlock the next level and mint
                the level NFT reward.
              </p>
            </div>

            <a
              href="https://explorer.ritualfoundation.org"
              target="_blank"
              className="mt-5 block rounded-2xl border border-cyan-300/40 bg-cyan-500/10 px-5 py-4 text-center font-black text-cyan-200"
            >
              View Ritual Explorer
            </a>
          </aside>
        </section>
      </div>
    </main>
  );
}