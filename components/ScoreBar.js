"use client";

import { useEffect, useState } from "react";
import { getScoreColor } from "@/lib/scoring";

export default function ScoreBar({ label, score }) {
  const [width, setWidth] = useState(0);
  const color = getScoreColor(score);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-text-dim font-mono">{label}</span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            transition: "width 0.8s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </div>
    </div>
  );
}
