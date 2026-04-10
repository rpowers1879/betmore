// ============================================================
// API Route: /api/ai
// ============================================================
// Proxies Claude Haiku calls. API key stays server-side.
// Accepts structured token data, returns AI reasoning.
// ============================================================

import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { reasoning: "AI analysis unavailable. API key not configured." },
      { status: 200 }
    );
  }

  try {
    const { promptData, score } = await request.json();

    if (!promptData) {
      return NextResponse.json(
        { error: "Missing prompt data" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `You are the Bet More AI, an on-chain analyst for Solana tokens. Your job is to give a clear, data-driven summary of what's happening with a token based on the numbers.

Your analysis rules:
- Lead with the key numbers: market cap, liquidity, volume, holder count, holder concentration
- Call out any RugCheck flags by name — these matter
- Note buy/sell ratio and what it suggests about current momentum
- Comment on the liquidity-to-market-cap ratio — is there enough liquidity for the size of this token?
- Keep it concise — 4-6 sentences max
- Use the actual dollar amounts, percentages, and counts from the data
- Be direct and honest. If the numbers look bad, say so plainly. If they look strong, say so
- Never use emojis
- Never use financial advice disclaimers
- Never use the word "straightforward"
- This should read like a quick analyst brief, not a sales pitch`,
        messages: [
          {
            role: "user",
            content: `Here is the on-chain data for this token:
${promptData}

Bet More Score: ${score}/100

Give a concise on-chain analysis based on these numbers.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return NextResponse.json(
        { reasoning: "AI analysis temporarily unavailable. Score and data are still valid." },
        { status: 200 }
      );
    }

    const data = await response.json();
    const reasoning =
      data.content?.map((c) => c.text || "").join("") ||
      "AI analysis unavailable.";

    return NextResponse.json({ reasoning });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { reasoning: "AI analysis failed. Score and data are still valid." },
      { status: 200 }
    );
  }
}
