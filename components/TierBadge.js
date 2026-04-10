"use client";

import { TIER_LIMITS } from "@/lib/tokengate";

const TIER_COLORS = {
  free: { bg: "#252833", text: "#8b8fa3", border: "#252833" },
  holder: { bg: "#22d68a15", text: "#22d68a", border: "#22d68a33" },
  whale: { bg: "#3b82f615", text: "#3b82f6", border: "#3b82f633" },
};

export default function TierBadge({ tier, scansUsed }) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.free;
  const limits = TIER_LIMITS[tier];
  const scansText =
    limits.scansPerDay === -1
      ? "unlimited"
      : `${scansUsed}/${limits.scansPerDay}`;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <span className="font-bold uppercase tracking-wider">
        {limits.label}
      </span>
      <span className="opacity-60">|</span>
      <span>{scansText} scans</span>
    </div>
  );
}
