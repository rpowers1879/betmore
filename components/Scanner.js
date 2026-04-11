"use client";

// ============================================================
// BET MORE - Scanner Component
// ============================================================
// Core scanner UI. Handles search, displays results,
// manages token gating, and triggers AI analysis.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  computeScores,
  buildAiPromptData,
  getScoreColor,
} from "@/lib/scoring";
import {
  getTokenBalance,
  getTierFromBalance,
  getDailyScanCount,
  incrementScanCount,
  hasScansRemaining,
  TIERS,
  TIER_LIMITS,
} from "@/lib/tokengate";
import { fmt, fmtNum, pct, ageDays } from "@/lib/format";
import ScoreRing from "./ScoreRing";
import ScoreBar from "./ScoreBar";
import TierBadge from "./TierBadge";
import ShareCard from "./ShareCard";

export default function Scanner() {
  const { publicKey, connected } = useWallet();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [aiReasoning, setAiReasoning] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showBubblemap, setShowBubblemap] = useState(false);
  const [tier, setTier] = useState(TIERS.FREE);
  const [scansUsed, setScansUsed] = useState(0);
  const [tierLoading, setTierLoading] = useState(false);

  // Check token balance when wallet connects
  useEffect(() => {
    async function checkTier() {
      if (!connected || !publicKey) {
        setTier(TIERS.FREE);
        return;
      }
      setTierLoading(true);
      try {
        const balance = await getTokenBalance(publicKey.toString());
        setTier(getTierFromBalance(balance));
      } catch {
        setTier(TIERS.FREE);
      }
      setTierLoading(false);
    }
    checkTier();
  }, [connected, publicKey]);

  // Track scan count
  useEffect(() => {
    setScansUsed(getDailyScanCount());
  }, [result]);

  // Scan handler
  const handleScan = useCallback(async () => {
    const addr = address.trim();
    if (!addr) return;

    // Check scan limits
    if (!hasScansRemaining(tier)) {
      setError(
        tier === TIERS.FREE
          ? "Daily scan limit reached. Connect wallet and hold $BET for more scans."
          : "Daily scan limit reached. Upgrade to Whale tier for unlimited scans."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAiReasoning(null);
    setShowBubblemap(false);

    try {
      const res = await fetch(`/api/scan?address=${encodeURIComponent(addr)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Scan failed. Please try again.");
        setLoading(false);
        return;
      }

      const scores = computeScores(data.pair, data.rugData, data.holderData);
      setResult({ pair: data.pair, rugData: data.rugData, holderData: data.holderData, scores, address: addr });
      incrementScanCount();
      setScansUsed(getDailyScanCount());
      setLoading(false);

      // Trigger AI if tier allows
      if (TIER_LIMITS[tier].aiAnalysis) {
        fetchAiReasoning(data.pair, data.rugData, scores, data.holderData);
      }
    } catch (err) {
      setError(`Scan failed: ${err.message}`);
      setLoading(false);
    }
  }, [address, tier]);

  // Auto-scan from URL param ?scan=
  const [autoScan, setAutoScan] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanAddr = params.get("scan");
    if (scanAddr && !result && !loading) {
      setAddress(scanAddr);
      setAutoScan(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoScan && address) {
      setAutoScan(false);
      handleScan();
    }
  }, [autoScan, address, handleScan]);

  // AI reasoning
  async function fetchAiReasoning(pair, rugData, scores, holderData) {
    setAiLoading(true);
    try {
      const promptData = buildAiPromptData(pair, rugData, scores, holderData);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptData, score: scores.total }),
      });
      const data = await res.json();
      setAiReasoning(data.reasoning || "AI analysis unavailable.");
    } catch {
      setAiReasoning("AI reasoning unavailable. Score and data are still valid.");
    }
    setAiLoading(false);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleScan();
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="px-5 pt-6 pb-5 border-b border-border bg-gradient-to-b from-surface-alt to-bg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-green-gradient">$BET</span>{" "}
              <span className="text-text-primary">MORE</span>
            </h1>
            <p className="font-mono text-[10px] text-text-muted tracking-[0.15em] uppercase">
              Scanner
            </p>
          </div>
          <WalletMultiButton />
        </div>

        {/* Tier display */}
        <div className="flex items-center justify-between">
          <TierBadge tier={tier} scansUsed={scansUsed} />
          {tierLoading && (
            <span className="font-mono text-xs text-text-muted">
              Checking balance...
            </span>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste Solana contract address..."
            className="flex-1 px-3.5 py-3 bg-surface border border-border rounded-full text-text-primary text-sm font-mono transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-text-muted"
          />
          <button
            onClick={handleScan}
            disabled={loading || !address.trim()}
            className="px-6 py-3 rounded-full text-sm font-bold font-display tracking-wider whitespace-nowrap transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading ? "#1a1d26" : "#22d68a",
              color: loading ? "#8b8fa3" : "#0a0b0d",
              cursor: loading ? "wait" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px rgba(34, 214, 138, 0.2)",
            }}
          >
            {loading ? "..." : "SCAN"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm font-mono">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-border border-t-accent rounded-full animate-spin" />
          <p className="text-text-dim text-sm font-mono">
            Pulling on-chain data...
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="px-5 pb-10 space-y-4">
          {/* Token header */}
          <div className="animate-fade-up flex items-center gap-3.5 p-4 bg-surface border border-border rounded-xl">
            {result.pair?.info?.imageUrl && (
              <img
                src={result.pair.info.imageUrl}
                alt=""
                className="w-11 h-11 rounded-full border-2 border-accent/20"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl font-extrabold truncate">
                {result.pair?.baseToken?.symbol || "???"}
              </div>
              <div className="text-xs text-text-dim truncate">
                {result.pair?.baseToken?.name || "Unknown Token"}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-base font-semibold">
                {result.pair?.priceUsd
                  ? `$${parseFloat(result.pair.priceUsd).toFixed(
                      parseFloat(result.pair.priceUsd) < 0.01 ? 8 : 4
                    )}`
                  : "N/A"}
              </div>
              <div
                className="text-xs font-mono"
                style={{
                  color:
                    (result.pair?.priceChange?.h24 || 0) >= 0
                      ? "#22d68a"
                      : "#ef4444",
                }}
              >
                {pct(result.pair?.priceChange?.h24)}
              </div>
            </div>
          </div>

          {/* Score ring */}
          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <ScoreRing score={result.scores.total} />
          </div>

          {/* Breakdown */}
          <div
            className="animate-fade-up p-5 bg-surface border border-border rounded-xl"
            style={{ animationDelay: "0.2s" }}
          >
            <h3 className="font-display text-sm font-bold text-text-dim tracking-wider mb-4">
              BREAKDOWN
            </h3>
            {Object.values(result.scores.categories).map((cat) => (
              <ScoreBar key={cat.label} label={cat.label} score={cat.score} />
            ))}
          </div>

          {/* Market data grid */}
          {result.pair && (
            <div
              className="animate-fade-up p-5 bg-surface border border-border rounded-xl"
              style={{ animationDelay: "0.3s" }}
            >
              <h3 className="font-display text-sm font-bold text-text-dim tracking-wider mb-4">
                MARKET DATA
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Market Cap",
                    value: fmt(result.pair.marketCap || result.pair.fdv),
                  },
                  {
                    label: "Liquidity",
                    value: fmt(result.pair.liquidity?.usd),
                  },
                  {
                    label: "24h Volume",
                    value: fmt(result.pair.volume?.h24),
                  },
                  {
                    label: "24h Buys",
                    value: fmtNum(result.pair.txns?.h24?.buys),
                  },
                  {
                    label: "24h Sells",
                    value: fmtNum(result.pair.txns?.h24?.sells),
                  },
                  {
                    label: "Age",
                    value: result.pair.pairCreatedAt
                      ? `${ageDays(result.pair.pairCreatedAt)}d`
                      : "N/A",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 bg-surface-alt rounded-lg"
                  >
                    <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1">
                      {item.label}
                    </div>
                    <div className="text-sm font-semibold font-mono">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Holder Analysis */}
          {result.holderData && (
            <div
              className="animate-fade-up p-5 bg-surface border border-border rounded-xl"
              style={{ animationDelay: "0.32s" }}
            >
              <h3 className="font-display text-sm font-bold text-text-dim tracking-wider mb-4">
                HOLDER ANALYSIS
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Top 5 Control", value: `${result.holderData.top5Pct}%` },
                  { label: "Top 10 Control", value: `${result.holderData.top10Pct}%` },
                  { label: "Top 20 Control", value: `${result.holderData.top20Pct}%` },
                  { label: "Largest Holder", value: `${result.holderData.topHolderPct}%` },
                ].map((item) => (
                  <div key={item.label} className="p-2.5 bg-surface-alt rounded-lg">
                    <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-1">
                      {item.label}
                    </div>
                    <div
                      className="text-sm font-semibold font-mono"
                      style={{
                        color:
                          parseFloat(item.value) > 50
                            ? "#ef4444"
                            : parseFloat(item.value) > 30
                              ? "#f59e0b"
                              : "#22d68a",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tier distribution */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: "Whales", count: result.holderData.tiers.whales, color: "#ef4444", desc: ">2%" },
                  { label: "Dolphins", count: result.holderData.tiers.dolphins, color: "#f59e0b", desc: "0.5-2%" },
                  { label: "Fish", count: result.holderData.tiers.fish, color: "#3b82f6", desc: "0.1-0.5%" },
                  { label: "Shrimp", count: result.holderData.tiers.shrimp, color: "#8b8fa3", desc: "<0.1%" },
                ].map((tier) => (
                  <div key={tier.label} className="flex-1 p-2 bg-surface-alt rounded-lg text-center">
                    <div className="text-lg font-bold font-mono" style={{ color: tier.color }}>
                      {tier.count}
                    </div>
                    <div className="text-[9px] text-text-muted font-mono uppercase tracking-widest">
                      {tier.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Top holders list */}
              <div className="space-y-1">
                <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest mb-2">
                  TOP HOLDERS
                </div>
                {result.holderData.holders.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-[10px] text-text-muted font-mono w-4">
                      {i + 1}
                    </span>
                    <a
                      href={`https://solscan.io/account/${h.owner || h.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs text-blue font-mono truncate no-underline hover:underline"
                    >
                      {(h.owner || h.address).slice(0, 4)}...{(h.owner || h.address).slice(-4)}
                    </a>
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{
                        color:
                          h.pct > 10
                            ? "#ef4444"
                            : h.pct > 5
                              ? "#f59e0b"
                              : "#8b8fa3",
                      }}
                    >
                      {h.pct.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Socials */}
          {result.pair?.info && (
            <div
              className="animate-fade-up p-5 bg-surface border border-border rounded-xl"
              style={{ animationDelay: "0.35s" }}
            >
              <h3 className="font-display text-sm font-bold text-text-dim tracking-wider mb-3">
                SOCIALS
              </h3>
              <div className="flex flex-wrap gap-2">
                {(result.pair.info.websites || []).map((w, i) => {
                  const url = w.url || w;
                  let hostname = "";
                  try {
                    hostname = new URL(url).hostname;
                  } catch {
                    hostname = url;
                  }
                  return (
                    <a
                      key={`w-${i}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-alt border border-border rounded-full text-text-dim text-xs font-mono hover:border-accent transition-colors no-underline"
                    >
                      <span className="text-accent font-bold">WEB</span>
                      <span>{hostname}</span>
                    </a>
                  );
                })}
                {(result.pair.info.socials || []).map((s, i) => {
                  const platform = s.platform || s.type || "?";
                  const icons = {
                    twitter: "X",
                    telegram: "TG",
                    discord: "DC",
                  };
                  return (
                    <a
                      key={`s-${i}`}
                      href={s.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-alt border border-border rounded-full text-text-dim text-xs font-mono hover:border-accent transition-colors no-underline"
                    >
                      <span className="text-accent font-bold">
                        {icons[platform] || platform.toUpperCase().slice(0, 3)}
                      </span>
                      {s.handle && <span>{s.handle}</span>}
                    </a>
                  );
                })}
                {!result.pair.info.websites?.length &&
                  !result.pair.info.socials?.length && (
                    <span className="text-danger text-sm font-mono">
                      No socials found. Major red flag.
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* RugCheck flags */}
          {result.rugData?.risks?.length > 0 && (
            <div
              className="animate-fade-up p-5 bg-surface border border-border rounded-xl"
              style={{ animationDelay: "0.4s" }}
            >
              <h3 className="font-display text-sm font-bold text-text-dim tracking-wider mb-3">
                RUGCHECK FLAGS
              </h3>
              <div className="space-y-1.5">
                {result.rugData.risks.map((risk, i) => {
                  const color =
                    risk.level === "danger" || risk.level === "error"
                      ? "#ef4444"
                      : risk.level === "warn" || risk.level === "warning"
                        ? "#f59e0b"
                        : "#22d68a";
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-surface-alt rounded-r-lg"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <span
                        className="text-[10px] font-bold font-mono flex-shrink-0 uppercase"
                        style={{ color }}
                      >
                        {risk.level?.toUpperCase() || "INFO"}
                      </span>
                      <span className="text-text-dim text-xs leading-relaxed">
                        {risk.description || risk.name || "Unknown risk"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div
            className="animate-fade-up p-5 bg-surface border border-accent/20 rounded-xl"
            style={{ animationDelay: "0.45s" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-2 h-2 rounded-full bg-accent ${aiLoading ? "animate-pulse-glow" : ""}`}
              />
              <h3 className="font-display text-sm font-bold text-accent tracking-wider">
                AI ANALYSIS
              </h3>
            </div>
            {!TIER_LIMITS[tier].aiAnalysis ? (
              <p className="text-sm text-text-muted italic">
                Connect wallet and hold $BET to unlock AI-powered analysis.
              </p>
            ) : aiLoading ? (
              <p className="text-sm text-text-muted italic">
                Analyzing on-chain data...
              </p>
            ) : (
              <p className="text-sm text-text-primary leading-relaxed">
                {aiReasoning || "Analysis unavailable."}
              </p>
            )}
          </div>

          {/* Bubblemaps */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            {!TIER_LIMITS[tier].bubblemap ? (
              <div className="p-4 bg-surface border border-border rounded-xl text-center">
                <p className="text-sm text-text-muted font-mono">
                  Hold $BET to unlock Bubblemaps visualization
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowBubblemap(!showBubblemap)}
                  className="w-full p-3.5 bg-surface border border-border text-text-primary text-sm font-bold font-display tracking-wider cursor-pointer transition-all hover:bg-surface-alt hover:border-accent"
                  style={{
                    borderRadius: showBubblemap
                      ? "12px 12px 0 0"
                      : "12px",
                  }}
                >
                  {showBubblemap ? "HIDE BUBBLEMAP" : "VIEW BUBBLEMAP"}
                </button>
                {showBubblemap && (
                  <div className="border border-border border-t-0 rounded-b-xl overflow-hidden">
                    <iframe
                      src={`https://app.bubblemaps.io/sol/token/${result.address}`}
                      className="w-full border-none bg-bg"
                      style={{ height: 500 }}
                      title="Bubblemaps"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* DexScreener link */}
          {result.pair?.url && (
            <a
              href={result.pair.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center p-3 bg-surface-alt border border-border rounded-xl text-accent text-sm font-mono no-underline hover:border-accent transition-colors"
            >
              View on DexScreener
            </a>
          )}

          {/* Share Card */}
          <div className="animate-fade-up" style={{ animationDelay: "0.55s" }}>
            <ShareCard result={result} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="py-16 px-5 text-center">
          <div className="text-5xl mb-4 opacity-20 font-display font-extrabold text-green-gradient">
            $BET
          </div>
          <p className="text-text-muted text-sm leading-relaxed max-w-[280px] mx-auto">
            Paste a Solana contract address to get a confidence score, risk
            analysis, and AI-powered take on whether to bet more.
          </p>
          {!connected && (
            <p className="mt-4 text-text-muted text-xs font-mono">
              Connect wallet + hold $BET for full access
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="px-5 py-6 border-t border-border text-center">
        <p className="font-mono text-[10px] text-text-muted tracking-widest">
          DATA: DEXSCREENER + RUGCHECK + BUBBLEMAPS
        </p>
      </footer>
    </div>
  );
}
