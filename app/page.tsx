"use client";

import { useEffect, useRef, useState } from "react";

const WIDTH = 10;
const HEIGHT = 20;
const BLOCK = 38;

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
];

function emptyBoard() {
  return Array.from({ length: HEIGHT }, () =>
    Array(WIDTH).fill(0)
  );
}

function randomPiece() {
  const shape =
    SHAPES[Math.floor(Math.random() * SHAPES.length)];

  return {
    x: 3,
    y: 0,
    shape,
  };
}

export default function Page() {
  const [board, setBoard] = useState<number[][]>(emptyBoard());
  const [piece, setPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("Tetris started.");

  const intervalRef = useRef<any>(null);

  function collide(
    px: number,
    py: number,
    shape: number[][]
  ) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;

        const nx = px + x;
        const ny = py + y;

        if (
          nx < 0 ||
          nx >= WIDTH ||
          ny >= HEIGHT
        ) {
          return true;
        }

        if (ny >= 0 && board[ny][nx]) {
          return true;
        }
      }
    }

    return false;
  }

  function mergePiece() {
    const next = board.map((r) => [...r]);

    piece.shape.forEach((row, y) => {
      row.forEach((v, x) => {
        if (v) {
          next[piece.y + y][piece.x + x] = 1;
        }
      });
    });

    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (next[y].every(Boolean)) {
        next.splice(y, 1);
        next.unshift(Array(WIDTH).fill(0));
        setScore((s) => s + 100);
      }
    }

    setBoard(next);
    setPiece(randomPiece());
  }

  function move(dx: number, dy: number) {
    if (!collide(piece.x + dx, piece.y + dy, piece.shape)) {
      setPiece((p) => ({
        ...p,
        x: p.x + dx,
        y: p.y + dy,
      }));
    } else if (dy > 0) {
      mergePiece();
    }
  }

  function rotate() {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map((r) => r[i]).reverse()
    );

    if (!collide(piece.x, piece.y, rotated)) {
      setPiece((p) => ({
        ...p,
        shape: rotated,
      }));
    }
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      move(0, 1);
    }, 700);

    return () => clearInterval(intervalRef.current);
  });

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a")
        move(-1, 0);

      if (e.key === "ArrowRight" || e.key === "d")
        move(1, 0);

      if (e.key === "ArrowDown" || e.key === "s")
        move(0, 1);

      if (e.key === "ArrowUp" || e.key === "w")
        rotate();

      if (e.key === " ") {
        while (
          !collide(
            piece.x,
            piece.y + 1,
            piece.shape
          )
        ) {
          piece.y++;
        }

        mergePiece();
      }
    }

    window.addEventListener("keydown", key);

    return () =>
      window.removeEventListener("keydown", key);
  });

  async function connectWallet() {
    const eth = (window as any).ethereum;

    if (!eth) {
      setMessage("Install MetaMask.");
      return;
    }

    const accounts = await eth.request({
      method: "eth_requestAccounts",
    });

    setWallet(accounts[0]);
  }

  async function faucet() {
    const res = await fetch("/api/faucet", {
      method: "POST",
    });

    const data = await res.json();

    setMessage(data.message);
  }

  async function mintNFT() {
    const res = await fetch("/api/mint", {
      method: "POST",
    });

    const data = await res.json();

    setMessage(data.message);
  }

  return (
    <main className="min-h-screen bg-[#09051f] text-white p-6">
      <div className="mx-auto flex max-w-[1700px] gap-8">
        <aside className="w-[340px] rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-5xl font-black">
            RITUAL TETRIS
          </h1>

          <button
            onClick={connectWallet}
            className="mt-8 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-4 text-xl font-black"
          >
            {wallet
              ? "Wallet Connected"
              : "Connect Wallet"}
          </button>

          <button
            onClick={faucet}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-4 text-xl font-black"
          >
            Faucet 0.01 Ritual
          </button>

          <button
            onClick={mintNFT}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-pink-500 py-4 text-xl font-black"
          >
            Mint NFT
          </button>

          <div className="mt-10 space-y-4 text-xl">
            <div>Score: {score}</div>
            <div>Controls:</div>
            <div>A / D → Move</div>
            <div>S → Fast Drop</div>
            <div>W → Rotate</div>
            <div>Space → Hard Drop</div>
          </div>

          <p className="mt-10 text-sm text-cyan-200">
            {message}
          </p>
        </aside>

        <section className="rounded-3xl border border-cyan-300/20 bg-white/5 p-8">
          <div
            className="grid gap-[3px] rounded-3xl bg-[#120d34] p-5"
            style={{
              gridTemplateColumns: `repeat(${WIDTH}, ${BLOCK}px)`,
            }}
          >
            {board.map((row, y) =>
              row.map((cell, x) => {
                let active = cell;

                piece.shape.forEach((r, py) => {
                  r.forEach((v, px) => {
                    if (
                      v &&
                      piece.x + px === x &&
                      piece.y + py === y
                    ) {
                      active = 1;
                    }
                  });
                });

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`rounded-lg border border-white/10 ${
                      active
                        ? "bg-gradient-to-br from-cyan-300 to-fuchsia-500 shadow-[0_0_18px_rgba(34,211,238,.9)]"
                        : "bg-[#1a163f]"
                    }`}
                    style={{
                      width: BLOCK,
                      height: BLOCK,
                    }}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}