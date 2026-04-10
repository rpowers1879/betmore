// ============================================================
// API Route: /api/scan
// ============================================================
// Proxies DexScreener + RugCheck calls server-side, plus
// on-chain holder analysis via Solana RPC.
// ============================================================

import { NextResponse } from "next/server";

const DEXSCREENER_BASE = "https://api.dexscreener.com";
const RUGCHECK_BASE = "https://api.rugcheck.xyz/v1";
const RPC_URL =
  process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// Fetch top holders + supply from Solana RPC
async function fetchHolderData(mintAddress) {
  try {
    // Parallel: top 20 holders + token supply
    const [largestRes, supplyRes] = await Promise.all([
      fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenLargestAccounts",
          params: [mintAddress],
        }),
      }),
      fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getTokenSupply",
          params: [mintAddress],
        }),
      }),
    ]);

    const largestData = await largestRes.json();
    const supplyData = await supplyRes.json();

    // Check for RPC errors (rate limiting, etc.)
    if (largestData.error || !largestData.result?.value?.length) {
      console.error("RPC error on getTokenLargestAccounts:", largestData.error?.message || "empty result");
      return null;
    }

    const accounts = largestData.result?.value || [];
    const supply = supplyData.result?.value || {};

    const totalSupplyRaw = parseInt(supply.amount || "0", 10);
    const decimals = supply.decimals || 0;
    const totalSupplyUi = totalSupplyRaw / Math.pow(10, decimals);

    // Resolve owner wallets for top 20 token accounts
    const ownerRes = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "getMultipleAccounts",
        params: [
          accounts.map((a) => a.address),
          { encoding: "jsonParsed" },
        ],
      }),
    });
    const ownerData = await ownerRes.json();
    const accountInfos = ownerData.result?.value || [];

    // Build holder analysis
    const holders = accounts.map((acc, i) => {
      const balanceRaw = parseInt(acc.amount || "0", 10);
      const balanceUi = balanceRaw / Math.pow(10, decimals);
      const pct = totalSupplyRaw > 0 ? (balanceRaw / totalSupplyRaw) * 100 : 0;
      const owner = accountInfos[i]?.data?.parsed?.info?.owner || acc.address;
      return {
        address: acc.address,
        owner,
        balance: balanceUi,
        balanceRaw,
        pct,
      };
    });

    // Concentration metrics
    const top5Pct = holders.slice(0, 5).reduce((sum, h) => sum + h.pct, 0);
    const top10Pct = holders.slice(0, 10).reduce((sum, h) => sum + h.pct, 0);
    const top20Pct = holders.slice(0, 20).reduce((sum, h) => sum + h.pct, 0);

    // Tier classification
    const whales = holders.filter((h) => h.pct >= 2);
    const dolphins = holders.filter((h) => h.pct >= 0.5 && h.pct < 2);
    const fish = holders.filter((h) => h.pct >= 0.1 && h.pct < 0.5);
    const shrimp = holders.filter((h) => h.pct < 0.1);

    // Distribution skew: how much does #1 holder dominate vs rest of top 10
    const topHolderPct = holders[0]?.pct || 0;
    const restTop10Pct = top10Pct - topHolderPct;
    const skewRatio =
      restTop10Pct > 0 ? topHolderPct / restTop10Pct : topHolderPct;

    return {
      totalSupply: totalSupplyUi,
      decimals,
      top5Pct: Math.round(top5Pct * 100) / 100,
      top10Pct: Math.round(top10Pct * 100) / 100,
      top20Pct: Math.round(top20Pct * 100) / 100,
      topHolderPct: Math.round(topHolderPct * 100) / 100,
      skewRatio: Math.round(skewRatio * 100) / 100,
      tiers: {
        whales: whales.length,
        dolphins: dolphins.length,
        fish: fish.length,
        shrimp: shrimp.length,
      },
      holders: holders.slice(0, 10), // Return top 10 for display
    };
  } catch (err) {
    console.error("Holder data fetch failed:", err);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address parameter" },
      { status: 400 }
    );
  }

  // Validate it looks like a Solana address (base58, 32-44 chars)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json(
      { error: "Invalid Solana address format" },
      { status: 400 }
    );
  }

  try {
    // Parallel fetch from all data sources
    const [dexRes, rugRes, holderData] = await Promise.allSettled([
      fetch(`${DEXSCREENER_BASE}/token-pairs/v1/solana/${address}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 30 },
      }),
      fetch(`${RUGCHECK_BASE}/tokens/${address}/report`, {
        headers: {
          Accept: "application/json",
          ...(process.env.RUGCHECK_API_KEY
            ? { "X-API-KEY": process.env.RUGCHECK_API_KEY }
            : {}),
        },
        next: { revalidate: 60 },
      }),
      fetchHolderData(address),
    ]);

    // Parse DexScreener response
    let dexData = null;
    if (dexRes.status === "fulfilled" && dexRes.value.ok) {
      dexData = await dexRes.value.json();
    }

    // Parse RugCheck response
    let rugData = null;
    if (rugRes.status === "fulfilled" && rugRes.value.ok) {
      rugData = await rugRes.value.json();
    }

    // Holder data (already parsed)
    const holders =
      holderData.status === "fulfilled" ? holderData.value : null;

    // Extract pairs array from DexScreener
    let pairs = [];
    if (Array.isArray(dexData)) {
      pairs = dexData;
    } else if (dexData?.pairs && Array.isArray(dexData.pairs)) {
      pairs = dexData.pairs;
    }

    if (pairs.length === 0 && !rugData) {
      return NextResponse.json(
        { error: "Token not found. Check the contract address." },
        { status: 404 }
      );
    }

    // Sort pairs by liquidity, pick best
    const bestPair =
      pairs.sort(
        (a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0)
      )[0] || null;

    return NextResponse.json({
      pair: bestPair,
      rugData,
      holderData: holders,
      allPairs: pairs.length,
    });
  } catch (err) {
    console.error("Scan API error:", err);
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
