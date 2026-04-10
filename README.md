# BET MORE - Memecoin Confidence Scanner

Scan any Solana memecoin. Get a confidence score. Know when to bet more.

## What It Does

Paste a Solana contract address. The app pulls data from three sources, runs it through a scoring engine, and gives you a 0-100 confidence score with an AI-powered analysis.

**Data Sources (all free):**
- **DexScreener API** - price, volume, liquidity, market cap, socials, pair age
- **RugCheck API** - security flags, mint/freeze authority, holder distribution
- **Bubblemaps** - visual holder clustering (iframe embed)

**AI Layer:**
- Claude Haiku 4.5 interprets the data and gives a plain English risk assessment
- Costs ~$0.0007 per scan (14,000 scans for $10)

**Token Gating (3 tiers):**
- **Free** - 3 scans/day, basic score only
- **Holder** - 50 scans/day, AI analysis, Bubblemaps
- **Whale** - Unlimited scans, full access

## Project Structure

```
bet-more/
├── app/
│   ├── api/
│   │   ├── scan/route.js      # Proxies DexScreener + RugCheck
│   │   └── ai/route.js        # Proxies Claude Haiku calls
│   ├── globals.css             # Tailwind + custom styles
│   ├── layout.js               # Root layout with wallet provider
│   └── page.js                 # Main page
├── components/
│   ├── Scanner.js              # Core scanner UI
│   ├── ScoreRing.js            # Animated SVG score display
│   ├── ScoreBar.js             # Category breakdown bars
│   ├── TierBadge.js            # Access tier indicator
│   └── WalletProvider.js       # Solana wallet adapter wrapper
├── lib/
│   ├── scoring.js              # Scoring engine (pure logic)
│   ├── tokengate.js            # Token balance checks + tier logic
│   └── format.js               # Number/string formatting utils
├── .env.example                # Environment variable template
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
└── package.json
```

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url> bet-more
cd bet-more
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Required: Anthropic API key for AI analysis
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Required: Your token's mint address on Solana
NEXT_PUBLIC_GATE_TOKEN_MINT=YOUR_TOKEN_MINT_HERE

# Token gating thresholds (raw amount with decimals)
# If your token has 9 decimals: 1000 tokens = 1000000000000
NEXT_PUBLIC_GATE_TIER_HOLDER=1000000000
NEXT_PUBLIC_GATE_TIER_WHALE=10000000000

# Solana RPC (default works, Helius recommended for production)
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Optional: RugCheck API key
RUGCHECK_API_KEY=
```

### 3. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Bet More scanner v1"
git remote add origin https://github.com/YOUR_USERNAME/bet-more.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Add environment variables in the Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_GATE_TOKEN_MINT`
   - `NEXT_PUBLIC_GATE_TIER_HOLDER`
   - `NEXT_PUBLIC_GATE_TIER_WHALE`
   - `NEXT_PUBLIC_SOLANA_RPC`
4. Deploy

Vercel will give you a URL like `bet-more-abc123.vercel.app`.

### 3. Connect Your GoDaddy Domain

**Option A: Subdomain (e.g., scan.yourdomain.com)**

1. Log into GoDaddy > DNS Management for your domain
2. Add a CNAME record:
   - Type: `CNAME`
   - Name: `scan` (or whatever subdomain you want)
   - Value: `cname.vercel-dns.com`
   - TTL: 600
3. In Vercel project settings > Domains, add `scan.yourdomain.com`
4. Wait 5-10 minutes for DNS propagation

**Option B: Root domain (e.g., yourdomain.com)**

1. In GoDaddy DNS, add an A record:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21`
   - TTL: 600
2. Add another A record (optional but recommended):
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.98`
   - TTL: 600
3. Add a CNAME for www:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: 600
4. In Vercel project settings > Domains, add both `yourdomain.com` and `www.yourdomain.com`

Vercel handles SSL automatically. No extra setup needed.

**Option C: Transfer nameservers to Vercel (cleanest)**

1. In Vercel project settings > Domains, add your domain
2. Vercel will show you nameserver values (e.g., `ns1.vercel-dns.com`)
3. In GoDaddy > DNS Management > Nameservers, switch to "Custom" and enter the Vercel nameservers
4. This gives Vercel full DNS control (fastest, most reliable)

## Customization

### Adjusting Score Weights

Edit `lib/scoring.js` - the `WEIGHTS` object at the top:

```js
export const WEIGHTS = {
  liquidity: 0.20,  // How important is LP health
  holders:  0.20,   // How important is holder distribution
  security: 0.20,   // How important are security flags
  volume:   0.15,   // How important is trading activity
  age:      0.10,   // How important is token age
  socials:  0.15,   // How important is social presence
};
```

Weights must add up to 1.0.

### Adjusting Token Gate Tiers

Edit the threshold values in `.env.local`. The numbers are raw token amounts
including decimals. For a token with 9 decimals:

- 100 tokens = `100000000000`
- 1,000 tokens = `1000000000000`
- 10,000 tokens = `10000000000000`

### Changing the AI Personality

Edit the system prompt in `app/api/ai/route.js`. The current prompt tells
Haiku to be "degen-friendly" and direct. Adjust the tone to match your
community's vibe.

## Cost Breakdown

| Item | Cost |
|------|------|
| DexScreener API | Free |
| RugCheck API | Free |
| Bubblemaps iframe | Free (demo partner ID) |
| Claude Haiku 4.5 | ~$0.0007/scan |
| Vercel hosting | Free tier (hobby) |
| Solana RPC | Free (public) or Helius free tier |
| **Total for 1,000 scans** | **~$0.70** |

## Production Recommendations

1. **Helius RPC** - Sign up at https://dev.helius.xyz for a free API key.
   Much more reliable than the public Solana RPC for token balance checks.

2. **Bubblemaps Partner ID** - Contact Bubblemaps for a real partner ID
   if you want the iframe on your production domain. Free for most use cases.

3. **Rate limiting** - Add rate limiting to your API routes if traffic
   grows. Vercel Edge Functions or a simple in-memory counter works.

4. **Caching** - The scan API route already uses Next.js revalidation
   (30s for DexScreener, 60s for RugCheck). Adjust as needed.

5. **Analytics** - Add Vercel Analytics or Plausible to track scan volume
   and popular tokens being searched.
