// ============================================================
// BET MORE - Formatting Utilities
// ============================================================

export function fmt(n, decimals = 2) {
  if (n === null || n === undefined) return "N/A";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(decimals)}K`;
  return `$${n.toFixed(decimals)}`;
}

export function fmtNum(n) {
  if (n === null || n === undefined) return "N/A";
  return n.toLocaleString();
}

export function pct(n) {
  if (n === null || n === undefined) return "N/A";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function shortenAddress(addr, chars = 4) {
  if (!addr) return "";
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function ageDays(timestamp) {
  if (!timestamp) return "N/A";
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}
