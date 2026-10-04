"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, tipsChain, tipsEnabled } from "@/lib/chain/config";

/**
 * Sign-in for tipping. Fans log in with email or Google and Privy creates an
 * embedded wallet behind it — the word "wallet" never has to reach them.
 *
 * With tips switched off this renders nothing extra, so the public site does
 * not load Privy at all.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  if (!tipsEnabled || !PRIVY_APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
        appearance: { theme: "light", accentColor: "#d5202a", landingHeader: "Sign in to support creators" },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          // Our own button is the confirmation: "Send $3" is the consent, and
          // a second signing modal would be exactly the crypto UI we avoid.
          showWalletUIs: false,
        },
        defaultChain: tipsChain,
        supportedChains: [tipsChain],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
