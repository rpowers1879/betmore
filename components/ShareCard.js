"use client";

import { useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/scoring";
import { fmt, ageDays } from "@/lib/format";

// Draw share card directly on Canvas 2D — no html2canvas, no DOM hacks.
// Works reliably on mobile Safari, Chrome, and desktop.

const W = 1200;
const H = 630;
const BG = "#0a0b0d";
const SURFACE = "#12141a";
const BORDER = "#252833";
const GREEN = "#22d68a";
const TEXT = "#e8eaed";
const DIM = "#8b8fa3";
const MUTED = "#555a6e";

function drawCard(ctx, { score, label, color, ticker, name, price, mcap, liq, vol, age, categories }) {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle gradient overlay at top
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, "rgba(34, 214, 138, 0.03)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 200);

  // ── Header ──
  ctx.font = "800 28px 'Montserrat', 'Arial Black', sans-serif";
  ctx.fillStyle = GREEN;
  ctx.fillText("$BET", 48, 68);
  const betW = ctx.measureText("$BET").width;
  ctx.fillStyle = TEXT;
  ctx.fillText(" MORE", 48 + betW, 68);

  ctx.font = "500 14px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText("SCANNER", W - 48, 68);
  ctx.textAlign = "left";

  // ── Score Ring (left side) ──
  const cx = 190;
  const cy = 320;
  const r = 95;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = SURFACE;
  ctx.lineWidth = 12;
  ctx.stroke();

  // Score arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * score) / 100;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";

  // Score number
  ctx.font = "800 64px 'Montserrat', 'Arial Black', sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 10);

  // "/ 100"
  ctx.font = "500 14px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = MUTED;
  ctx.fillText("/ 100", cx, cy + 36);

  // Label
  ctx.font = "800 15px 'Montserrat', 'Arial Black', sans-serif";
  ctx.fillStyle = color;
  ctx.letterSpacing = "2px";
  ctx.fillText(label, cx, cy + r + 36);
  ctx.textAlign = "left";

  // ── Token Info (right side) ──
  const rx = 340;

  // Token name
  ctx.font = "800 32px 'Montserrat', 'Arial Black', sans-serif";
  ctx.fillStyle = TEXT;
  ctx.fillText(name, rx, 148);
  const nameW = ctx.measureText(name).width;
  ctx.font = "600 24px 'Montserrat', sans-serif";
  ctx.fillStyle = DIM;
  ctx.fillText(` ($${ticker})`, rx + nameW, 148);

  // Market data row 1
  ctx.font = "500 14px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = DIM;
  ctx.fillText(`Price: ${price}`, rx, 180);
  ctx.fillText(`MCap: ${mcap}`, rx + 300, 180);
  ctx.fillText(`Liq: ${liq}`, rx + 540, 180);

  // Market data row 2
  ctx.fillText(`Vol 24h: ${vol}`, rx, 204);
  ctx.fillText(`Age: ${age}`, rx + 300, 204);

  // ── Category Bars ──
  const barX = rx;
  let barY = 248;
  const barW = W - rx - 60;
  const barH = 8;

  categories.forEach((cat) => {
    const barColor = getScoreColor(cat.score);

    // Label
    ctx.font = "500 13px 'JetBrains Mono', 'Courier New', monospace";
    ctx.fillStyle = DIM;
    ctx.fillText(cat.label, barX, barY);

    // Score value
    ctx.fillStyle = barColor;
    ctx.font = "600 13px 'JetBrains Mono', 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(cat.score), barX + barW, barY);
    ctx.textAlign = "left";

    barY += 8;

    // Track
    ctx.fillStyle = SURFACE;
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    // Fill
    const fillW = Math.max(4, (cat.score / 100) * barW);
    ctx.fillStyle = barColor;
    roundRect(ctx, barX, barY, fillW, barH, 4);
    ctx.fill();

    barY += 32;
  });

  // ── Footer ──
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, H - 56);
  ctx.lineTo(W - 48, H - 56);
  ctx.stroke();

  ctx.font = "500 13px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = MUTED;
  ctx.fillText("betmore.lol", 48, H - 28);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.fillText("Powered by ", W - 48 - ctx.measureText("$BET").width, H - 28);
  ctx.fillStyle = GREEN;
  ctx.font = "700 13px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillText("$BET", W - 48, H - 28);
  ctx.textAlign = "left";
}

// Rounded rect helper
function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function ShareCard({ result }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!result?.scores) return null;

  const { pair, scores, address } = result;
  const score = scores.total;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const ticker = pair?.baseToken?.symbol || "???";
  const name = pair?.baseToken?.name || "Unknown";
  const price = pair?.priceUsd
    ? `$${parseFloat(pair.priceUsd).toFixed(
        parseFloat(pair.priceUsd) < 0.01 ? 8 : 4
      )}`
    : "N/A";
  const categories = Object.values(scores.categories);

  async function handleShare() {
    setGenerating(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;  // 2x for retina
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);

      drawCard(ctx, {
        score,
        label,
        color,
        ticker,
        name,
        price,
        mcap: fmt(pair?.marketCap || pair?.fdv),
        liq: fmt(pair?.liquidity?.usd),
        vol: fmt(pair?.volume?.h24),
        age: pair?.pairCreatedAt ? `${ageDays(pair.pairCreatedAt)}d` : "N/A",
        categories,
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas capture failed"))),
          "image/png"
        );
      });

      const file = new File([blob], `betmore-${ticker}.png`, {
        type: "image/png",
      });

      // Mobile native share
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${ticker} - Bet More Score: ${score}/100`,
          text: `${label} - scanned on betmore.lol`,
          files: [file],
        });
      } else {
        // Desktop fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `betmore-${ticker}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // User cancelling share sheet throws — don't show as error
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
        setError("Share failed. Try again.");
      }
    }
    setGenerating(false);
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}?scan=${address}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for mobile browsers that block clipboard
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 w-full">
        <button
          onClick={handleShare}
          disabled={generating}
          className="flex-1 py-3 bg-surface border border-border rounded-xl text-sm font-bold font-display tracking-wider transition-all hover:border-accent hover:bg-surface-alt disabled:opacity-50"
          style={{ cursor: generating ? "wait" : "pointer" }}
        >
          {generating ? "GENERATING..." : "SHARE"}
        </button>
        <button
          onClick={handleCopyLink}
          className="flex-1 py-3 bg-surface border border-border rounded-xl text-sm font-bold font-display tracking-wider transition-all hover:border-accent hover:bg-surface-alt"
        >
          {copied ? "COPIED!" : "COPY LINK"}
        </button>
      </div>
      {error && (
        <p className="text-center text-danger text-xs font-mono">{error}</p>
      )}
    </div>
  );
}
