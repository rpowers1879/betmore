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
        system: `You are the Bet More AI, an on-chain analyst specializing in Solana memecoins and small-cap tokens. Your job is to give a clear, data-driven summary based on the numbers.

IMPORTANT — you are analyzing memecoins, not blue chips. Calibrate your expectations:
- Liquidity: $50K-$500K is normal for memecoins. $500K+ is strong. Under $20K is genuinely thin. Do NOT alarm about liquidity unless it's actually low for a memecoin. A 3-5% liquidity/mcap ratio is standard in this space.
- Volume: $10K-$100K daily is typical. Over $100K is active. Under $1K is dead.
- Holders: 500-5,000 is normal. Over 10,000 is strong community. Under 100 is early/risky.
- Concentration: Top 10 holding 30-50% is common for memecoins. Over 60% is a real concern. Under 30% is well distributed.
- Age: Most memecoins are days to weeks old. Surviving 30+ days is notable. 90+ days is established for this space.

Your analysis rules:
- Summarize the key numbers: market cap, liquidity, volume, holder count, top holder concentration
- Call out any RugCheck danger flags by name — those actually matter
- Note buy/sell ratio and what it suggests about current momentum
- Only flag liquidity as a concern if it's genuinely low for a memecoin, not by traditional finance standards
- Keep it concise — 4-6 sentences max
- Use the actual dollar amounts, percentages, and counts from the data
- Be honest but calibrated. Judge the token against other memecoins, not against ETH or SOL
- Never use emojis
- Never use financial advice disclaimers
- Never use the word "straightforward"
- This should read like a quick analyst brief from someone who actually trades memecoins`,
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
