"use client";

import { useRef, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/scoring";
import { fmt, ageDays } from "@/lib/format";

export default function ShareCard({ result }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0b0d",
        scale: 2,
        useCORS: false,
        logging: false,
        width: 1200,
        height: 630,
      });

      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], `betmore-${ticker}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${ticker} - Bet More Score: ${score}/100`,
          text: `${label} - scanned on betmore.lol`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `betmore-${ticker}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
    setGenerating(false);
  }

  function handleCopyLink() {
    const url = `${window.location.origin}?scan=${address}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {/* Hidden card for capture */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
        }}
      >
        <div
          ref={cardRef}
          style={{
            width: 1200,
            height: 630,
            background: "#0a0b0d",
            padding: 48,
            fontFamily: "'Montserrat', 'Poppins', sans-serif",
            color: "#e8eaed",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              <span style={{ color: "#22d68a" }}>$BET</span>{" "}
              <span style={{ color: "#e8eaed" }}>MORE</span>
            </div>
            <div
              style={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                color: "#555a6e",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Scanner
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flex: 1, gap: 48 }}>
            {/* Left: Score ring */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 280,
                flexShrink: 0,
              }}
            >
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#1a1d26"
                  strokeWidth="10"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 85}
                  strokeDashoffset={2 * Math.PI * 85 * (1 - score / 100)}
                  transform="rotate(-90 100 100)"
                />
                <text
                  x="100"
                  y="90"
                  textAnchor="middle"
                  fill={color}
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {score}
                </text>
                <text
                  x="100"
                  y="118"
                  textAnchor="middle"
                  fill="#555a6e"
                  style={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  / 100
                </text>
              </svg>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  color,
                }}
              >
                {label}
              </div>
            </div>

            {/* Right: Token info + bars */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* Token name */}
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {name}{" "}
                  <span style={{ color: "#8b8fa3" }}>(${ticker})</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    color: "#8b8fa3",
                  }}
                >
                  <span>Price: {price}</span>
                  <span>
                    MCap: {fmt(pair?.marketCap || pair?.fdv)}
                  </span>
                  <span>
                    Liq: {fmt(pair?.liquidity?.usd)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    color: "#8b8fa3",
                    marginTop: 4,
                  }}
                >
                  <span>
                    Vol 24h: {fmt(pair?.volume?.h24)}
                  </span>
                  <span>
                    Age:{" "}
                    {pair?.pairCreatedAt
                      ? `${ageDays(pair.pairCreatedAt)}d`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Category bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {categories.map((cat) => {
                  const barColor = getScoreColor(cat.score);
                  return (
                    <div key={cat.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "#8b8fa3" }}>
                          {cat.label}
                        </span>
                        <span style={{ color: barColor, fontWeight: 600 }}>
                          {cat.score}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: "#1a1d26",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${cat.score}%`,
                            background: barColor,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid #252833",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#555a6e",
                letterSpacing: "0.1em",
              }}
            >
              betmore.lol
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#555a6e",
                letterSpacing: "0.1em",
              }}
            >
              Powered by{" "}
              <span style={{ color: "#22d68a", fontWeight: 700 }}>
                $BET
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Visible buttons */}
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
    </>
  );
}
