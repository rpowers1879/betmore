// ============================================================
// BET MORE - Scoring Engine
// ============================================================
// Pure scoring logic. No API calls, no AI. Just math.
// Each category returns 0-100. Weights produce final score.
// ============================================================

export const WEIGHTS = {
  liquidity: 0.20,
  holders: 0.20,
  security: 0.20,
  volume: 0.15,
  age: 0.10,
  socials: 0.15,
};

// -- Liquidity Health --
// Checks LP size, LP-to-mcap ratio
export function scoreLiquidity(pair) {
  if (!pair) return 0;
  let s = 0;
  const liq = pair.liquidity?.usd || 0;
  const mc = pair.marketCap || pair.fdv || 1;
  const ratio = liq / mc;

  // Absolute liquidity
  if (liq > 100000) s += 30;
  else if (liq > 50000) s += 25;
  else if (liq > 10000) s += 15;
  else if (liq > 1000) s += 5;

  // Ratio to market cap (healthy = higher)
  if (ratio > 0.5) s += 40;
  else if (ratio > 0.2) s += 30;
  else if (ratio > 0.1) s += 20;
  else if (ratio > 0.05) s += 10;

  // Exists at all
  s += liq > 0 ? 30 : 0;

  return Math.min(100, s);
}

// -- Holder Distribution --
// Checks holder concentration from on-chain data + RugCheck
export function scoreHolders(rugData, holderData) {
  let s = 0;

  // Use on-chain holder data if available, fall back to RugCheck
  if (holderData) {
    const { top5Pct, top10Pct, topHolderPct, skewRatio, tiers } = holderData;

    // Top 10 concentration (lower = better)
    if (top10Pct < 20) s += 40;
    else if (top10Pct < 35) s += 30;
    else if (top10Pct < 50) s += 20;
    else if (top10Pct < 70) s += 10;

    // Single whale dominance (lower = better)
    if (topHolderPct < 2) s += 25;
    else if (topHolderPct < 5) s += 15;
    else if (topHolderPct < 10) s += 5;

    // Distribution spread — more dolphins/fish = healthier
    const diversityCount = tiers.dolphins + tiers.fish;
    if (diversityCount >= 10) s += 20;
    else if (diversityCount >= 5) s += 15;
    else if (diversityCount >= 2) s += 10;
    else s += 5;

    // Skew penalty — if #1 holder dwarfs the rest of top 10
    if (skewRatio < 0.5) s += 15;
    else if (skewRatio < 1) s += 10;
    else if (skewRatio > 3) s -= 10;

    return Math.min(100, Math.max(0, s));
  }

  // Fallback to RugCheck data
  if (!rugData) return 50;
  const topHolders = rugData.topHolders || [];
  const totalHolders = rugData.totalHolders || rugData.holderCount || topHolders.length;

  if (totalHolders > 1000) s += 35;
  else if (totalHolders > 500) s += 30;
  else if (totalHolders > 100) s += 20;
  else if (totalHolders > 50) s += 10;
  else s += 5;

  const top10Pct = topHolders
    .slice(0, 10)
    .reduce((sum, h) => sum + (h.pct || 0), 0);

  if (top10Pct < 20) s += 40;
  else if (top10Pct < 35) s += 30;
  else if (top10Pct < 50) s += 20;
  else if (top10Pct < 70) s += 10;

  s += Math.min(25, Math.max(0, 25 - (top10Pct - 10)));

  return Math.min(100, Math.max(0, s));
}

// -- Security --
// Checks mint auth, freeze auth, RugCheck flags
export function scoreSecurity(rugData) {
  if (!rugData) return 50;
  let s = 50;
  const risks = rugData.risks || [];

  // Mint authority
  const hasMintAuth = risks.some(
    (r) => r.name?.toLowerCase().includes("mint") && r.level !== "none"
  );
  if (!hasMintAuth) s += 25;
  else s -= 20;

  // Freeze authority
  const hasFreezeAuth = risks.some(
    (r) => r.name?.toLowerCase().includes("freeze") && r.level !== "none"
  );
  if (!hasFreezeAuth) s += 15;
  else s -= 10;

  // LP burned bonus
  const hasLpBurned = risks.some(
    (r) => r.name?.toLowerCase().includes("burn") && r.level === "none"
  );
  if (hasLpBurned) s += 10;

  // Penalty per danger/warning flag
  const dangerCount = risks.filter(
    (r) => r.level === "danger" || r.level === "error"
  ).length;
  const warnCount = risks.filter(
    (r) => r.level === "warn" || r.level === "warning"
  ).length;
  s -= dangerCount * 10;
  s -= warnCount * 5;

  return Math.min(100, Math.max(0, s));
}

// -- Volume & Momentum --
// Checks 24h volume, volume/mcap ratio, buy/sell ratio
export function scoreVolume(pair) {
  if (!pair) return 0;
  let s = 0;
  const vol24 = pair.volume?.h24 || 0;
  const mc = pair.marketCap || pair.fdv || 1;
  const volRatio = vol24 / mc;

  // Volume to mcap ratio
  if (volRatio > 1) s += 40;
  else if (volRatio > 0.5) s += 35;
  else if (volRatio > 0.2) s += 25;
  else if (volRatio > 0.1) s += 15;
  else if (volRatio > 0.01) s += 5;

  // Buy/sell pressure
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const total = buys + sells;
  if (total > 0) {
    const buyRatio = buys / total;
    if (buyRatio > 0.6) s += 30;
    else if (buyRatio > 0.5) s += 20;
    else if (buyRatio > 0.4) s += 10;
  }

  // Absolute volume
  if (vol24 > 100000) s += 30;
  else if (vol24 > 10000) s += 20;
  else if (vol24 > 1000) s += 10;

  return Math.min(100, s);
}

// -- Token Age & Survival --
// Older tokens that are still alive = more confidence
export function scoreAge(pair) {
  if (!pair?.pairCreatedAt) return 30;
  const ageMs = Date.now() - pair.pairCreatedAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > 365) return 95;
  if (ageDays > 180) return 85;
  if (ageDays > 90) return 70;
  if (ageDays > 30) return 55;
  if (ageDays > 7) return 35;
  if (ageDays > 1) return 15;
  return 5;
}

// -- Social Presence --
// Checks DexScreener socials data
export function scoreSocials(pair) {
  if (!pair) return 0;
  let s = 0;
  const info = pair.info || {};
  const socials = info.socials || [];
  const websites = info.websites || [];

  if (websites.length > 0) s += 30;
  if (socials.some((x) => x.platform === "twitter" || x.type === "twitter"))
    s += 30;
  if (socials.some((x) => x.platform === "telegram" || x.type === "telegram"))
    s += 20;
  if (socials.some((x) => x.platform === "discord" || x.type === "discord"))
    s += 10;
  if (info.imageUrl) s += 10;

  return Math.min(100, s);
}

// -- Compute all scores --
export function computeScores(pair, rugData, holderData) {
  const categories = {
    liquidity: {
      score: scoreLiquidity(pair),
      weight: WEIGHTS.liquidity,
      label: "Liquidity",
    },
    holders: {
      score: scoreHolders(rugData, holderData),
      weight: WEIGHTS.holders,
      label: "Holders",
    },
    security: {
      score: scoreSecurity(rugData),
      weight: WEIGHTS.security,
      label: "Security",
    },
    volume: {
      score: scoreVolume(pair),
      weight: WEIGHTS.volume,
      label: "Volume",
    },
    age: {
      score: scoreAge(pair),
      weight: WEIGHTS.age,
      label: "Age",
    },
    socials: {
      score: scoreSocials(pair),
      weight: WEIGHTS.socials,
      label: "Socials",
    },
  };

  const total = Object.values(categories).reduce(
    (sum, c) => sum + c.score * c.weight,
    0
  );

  return { total: Math.round(total), categories };
}

// -- Helpers --
export function getScoreColor(score) {
  if (score >= 75) return "#22d68a";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function getScoreLabel(score) {
  if (score >= 80) return "BET MORE";
  if (score >= 65) return "LET IT RIDE";
  if (score >= 50) return "DEGEN TERRITORY";
  if (score >= 35) return "DEAD MONEY";
  return "EXIT LIQUIDITY";
}

// -- Build AI prompt data --
export function buildAiPromptData(pair, rugData, scores, holderData) {
  const lines = [];

  if (pair) {
    lines.push(
      `Token: ${pair.baseToken?.name || "Unknown"} (${pair.baseToken?.symbol || "?"})`
    );
    lines.push(`Price: $${pair.priceUsd || "N/A"}`);
    lines.push(`Market Cap: $${(pair.marketCap || pair.fdv || 0).toLocaleString()}`);
    lines.push(`Liquidity: $${(pair.liquidity?.usd || 0).toLocaleString()}`);
    lines.push(`24h Volume: $${(pair.volume?.h24 || 0).toLocaleString()}`);
    lines.push(
      `24h Buys: ${pair.txns?.h24?.buys || 0}, Sells: ${pair.txns?.h24?.sells || 0}`
    );
    lines.push(
      `24h Price Change: ${(pair.priceChange?.h24 || 0) > 0 ? "+" : ""}${(pair.priceChange?.h24 || 0).toFixed(2)}%`
    );

    const ageDays = pair.pairCreatedAt
      ? Math.floor((Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60 * 24))
      : "unknown";
    lines.push(`Age: ${ageDays} days`);

    const socials = pair.info?.socials || [];
    const websites = pair.info?.websites || [];
    lines.push(
      `Socials: ${socials.length > 0 ? socials.map((s) => s.platform || s.type).join(", ") : "none"}`
    );
    lines.push(`Website: ${websites.length > 0 ? "yes" : "no"}`);
  }

  if (rugData) {
    const risks = rugData.risks || [];
    const dangers = risks.filter(
      (r) => r.level === "danger" || r.level === "error"
    );
    const warns = risks.filter(
      (r) => r.level === "warn" || r.level === "warning"
    );
    lines.push(
      `RugCheck Dangers: ${dangers.length > 0 ? dangers.map((r) => r.name || r.description).join(", ") : "none"}`
    );
    lines.push(
      `RugCheck Warnings: ${warns.length > 0 ? warns.map((r) => r.name || r.description).join(", ") : "none"}`
    );

    // Total holder count from RugCheck (this is the REAL total, not just top 20)
    const totalHolders = rugData.totalHolders || rugData.holderCount || "unknown";
    lines.push(`Total Holders (all wallets): ${typeof totalHolders === 'number' ? totalHolders.toLocaleString() : totalHolders}`);
  }

  // On-chain holder concentration (top 20 largest wallets only — NOT the total holder count)
  if (holderData) {
    lines.push(`\n--- Concentration Analysis (largest 20 wallets out of all holders above) ---`);
    lines.push(`Total Supply: ${holderData.totalSupply?.toLocaleString()}`);
    lines.push(`Top 5 Wallets Control: ${holderData.top5Pct}% of supply`);
    lines.push(`Top 10 Wallets Control: ${holderData.top10Pct}% of supply`);
    lines.push(`Top 20 Wallets Control: ${holderData.top20Pct}% of supply`);
    lines.push(`Largest Single Wallet: ${holderData.topHolderPct}% of supply`);
    lines.push(`Skew Ratio (#1 vs rest of top 10): ${holderData.skewRatio}`);
    lines.push(
      `Among top 20: ${holderData.tiers.whales} whales (>2%), ${holderData.tiers.dolphins} dolphins (0.5-2%), ${holderData.tiers.fish} fish (0.1-0.5%), ${holderData.tiers.shrimp} shrimp (<0.1%)`
    );
  }

  lines.push(
    `\nCategory Scores: ${Object.values(scores.categories)
      .map((c) => `${c.label}: ${c.score}/100`)
      .join(", ")}`
  );

  return lines.join("\n");
}
