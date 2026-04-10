// ============================================================
// BET MORE - Token Gate Logic
// ============================================================
// Checks connected wallet for your token balance via
// server-side API (keeps RPC key hidden from browser).
// ============================================================

const TIER_HOLDER = parseInt(process.env.NEXT_PUBLIC_GATE_TIER_HOLDER || "1000000000", 10);
const TIER_WHALE = parseInt(process.env.NEXT_PUBLIC_GATE_TIER_WHALE || "10000000000", 10);

export const TIERS = {
  FREE: "free",
  HOLDER: "holder",
  WHALE: "whale",
};

export const TIER_LIMITS = {
  [TIERS.FREE]: {
    label: "Free",
    scansPerDay: 999,  // TODO: revert to 3 before production
    aiAnalysis: true,   // TODO: revert to false before production
    bubblemap: true,    // TODO: revert to false before production
    description: "3 scans/day, basic score only",
  },
  [TIERS.HOLDER]: {
    label: "Holder",
    scansPerDay: 50,
    aiAnalysis: true,
    bubblemap: true,
    description: "50 scans/day, AI analysis, Bubblemaps",
  },
  [TIERS.WHALE]: {
    label: "Whale",
    scansPerDay: -1, // unlimited
    aiAnalysis: true,
    bubblemap: true,
    description: "Unlimited scans, full access",
  },
};

// Get token balance for a wallet (via server-side API)
export async function getTokenBalance(walletAddress) {
  if (!walletAddress) return 0;

  try {
    const res = await fetch(`/api/balance?wallet=${encodeURIComponent(walletAddress)}`);
    const data = await res.json();
    return data.balance || 0;
  } catch (err) {
    console.error("Token balance check failed:", err);
    return 0;
  }
}

// Determine tier from balance
export function getTierFromBalance(balance) {
  if (balance >= TIER_WHALE) return TIERS.WHALE;
  if (balance >= TIER_HOLDER) return TIERS.HOLDER;
  return TIERS.FREE;
}

// Check if user can perform action based on tier
export function canAccess(tier, feature) {
  const limits = TIER_LIMITS[tier];
  if (!limits) return false;
  return limits[feature] === true || limits[feature] === -1;
}

// Get daily scan count from localStorage
export function getDailyScanCount() {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().split("T")[0];
  const stored = localStorage.getItem("betmore_scans");
  if (!stored) return 0;
  try {
    const data = JSON.parse(stored);
    return data.date === today ? data.count : 0;
  } catch {
    return 0;
  }
}

// Increment daily scan count
export function incrementScanCount() {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().split("T")[0];
  const current = getDailyScanCount();
  localStorage.setItem(
    "betmore_scans",
    JSON.stringify({ date: today, count: current + 1 })
  );
}

// Check if user has scans remaining
export function hasScansRemaining(tier) {
  const limits = TIER_LIMITS[tier];
  if (limits.scansPerDay === -1) return true;
  return getDailyScanCount() < limits.scansPerDay;
}
