"use client";

import { getScoreColor, getScoreLabel } from "@/lib/scoring";

export default function ScoreRing({ score }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="text-center py-8 px-5 bg-surface border border-border rounded-xl relative overflow-hidden">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="mx-auto block"
      >
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="#1a1d26"
          strokeWidth="8"
        />
        <circle
          className="score-ring"
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
        <text
          x="80"
          y="72"
          textAnchor="middle"
          fill={color}
          className="font-display"
          style={{ fontSize: 44, fontWeight: 800 }}
        >
          {score}
        </text>
        <text
          x="80"
          y="98"
          textAnchor="middle"
          fill="#555a6e"
          className="font-mono"
          style={{ fontSize: 10 }}
        >
          / 100
        </text>
      </svg>
      <div
        className="mt-4 font-display text-base font-extrabold tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  );
}
