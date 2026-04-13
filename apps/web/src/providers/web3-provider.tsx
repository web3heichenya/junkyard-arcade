'use client';

import '@rainbow-me/rainbowkit/styles.css';
import * as React from 'react';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'Junkyard Arcade',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
  chains: [baseSepolia],
  ssr: true,
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
