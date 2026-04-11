import "./globals.css";
import WalletContextProvider from "@/components/WalletProvider";

export const metadata = {
  title: "Bet More | Scanner",
  description:
    "Scan any Solana memecoin for a confidence score. On-chain data from DexScreener, RugCheck, and Bubblemaps with AI-powered analysis.",
  openGraph: {
    title: "Bet More | Scanner",
    description:
      "Should you bet more? Scan any Solana token for a confidence score backed by on-chain data.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bet More | Scanner",
    description:
      "Should you bet more? Scan any Solana token for a confidence score backed by on-chain data.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
