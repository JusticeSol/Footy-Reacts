# .media · 6 assets

id         type   dur    dims   path                  description
voice_001  voice  11.8s  —      assets/voice/f02.wav  Fans sign in to Footy Reacts with email or Google, through Privy. On first login, Privy creates an embedded wallet behind it. No download, no seed phrase. The fan never sees the word wallet.
voice_002  voice  10.1s  —      assets/voice/f03.wav  It's one configuration: email and Google login, a wallet for every user who doesn't have one, and Privy's own wallet screens switched off, because our button is the confirmation.
voice_003  voice  10.4s  —      assets/voice/f04.wav  When a fan taps send three dollars, the embedded wallet signs a USDC transfer authorisation. There's no second pop-up. Our relayer submits it to TipJar on Monad, and pays the gas.
voice_004  voice  12.6s  —      assets/voice/f05.wav  Under the hood, the tip is one signTypedData call on the embedded wallet. And every request that moves money carries the user's Privy access token, which our server verifies with Privy's Node SDK before anything is relayed.
voice_005  voice  7.2s   —      assets/voice/f06.wav  Creators sign in with Privy too. When they claim, everything held for their channel is swept straight into their own embedded wallet.
voice_006  voice  9.5s   —      assets/voice/f07.wav  And it really is theirs. From the account page, Privy's key export lets anyone take their wallet to MetaMask or Rabby. Footy Reacts never sees the key.
