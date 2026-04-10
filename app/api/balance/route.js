// ============================================================
// API Route: /api/balance
// ============================================================
// Server-side token balance check. Keeps RPC URL + API key
// hidden from the browser.
// ============================================================

import { NextResponse } from "next/server";

const RPC_URL = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const TOKEN_MINT = process.env.NEXT_PUBLIC_GATE_TOKEN_MINT || "";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });
  }

  if (!TOKEN_MINT) {
    return NextResponse.json({ balance: 0 });
  }

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          wallet,
          { mint: TOKEN_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    });

    const data = await res.json();
    const accounts = data.result?.value || [];

    const totalBalance = accounts.reduce((sum, account) => {
      const amount = account.account.data.parsed.info.tokenAmount;
      return sum + parseInt(amount.amount, 10);
    }, 0);

    return NextResponse.json({ balance: totalBalance });
  } catch (err) {
    console.error("Balance check failed:", err);
    return NextResponse.json({ balance: 0 });
  }
}
