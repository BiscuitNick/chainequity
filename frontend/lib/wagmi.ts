/**
 * Wagmi Configuration
 *
 * Sets up Web3 wallet connectivity with wagmi, viem, and RainbowKit
 * Configured for Polygon Amoy testnet with Alchemy as the RPC provider
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';
import { http } from 'viem';

// Get configuration from environment variables
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!alchemyApiKey) {
  console.warn('NEXT_PUBLIC_ALCHEMY_API_KEY is not defined. Using public RPC endpoint.');
}

if (!walletConnectProjectId) {
  throw new Error(
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. ' +
    'Get a project ID at https://cloud.walletconnect.com'
  );
}

// Configure wagmi with RainbowKit
export const config = getDefaultConfig({
  appName: 'ChainEquity Dashboard',
  projectId: walletConnectProjectId,
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(
      alchemyApiKey
        ? `https://polygon-amoy.g.alchemy.com/v2/${alchemyApiKey}`
        : polygonAmoy.rpcUrls.default.http[0]
    ),
  },
  ssr: true, // Enable server-side rendering support
});

// Export chain for convenience
export { polygonAmoy as defaultChain };
