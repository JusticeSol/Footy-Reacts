"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, tipsChain } from "@/lib/chain/config";
import { TipsReady } from "./context";

/**
 * Sign-in for tipping. Fans log in with email or Google and Privy creates an
 * embedded wallet behind it — the word "wallet" never has to reach them.
 *
 * Only ever loaded with a dynamic import from Providers, so Privy's SDK stays
 * out of the page bundle and the server render entirely.
 */
export default function PrivyRoot({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID!}
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
      <TipsReady.Provider value={true}>{children}</TipsReady.Provider>
    </PrivyProvider>
  );
}
