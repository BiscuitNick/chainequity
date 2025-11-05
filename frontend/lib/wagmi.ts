/**
 * Wagmi Configuration
 *
 * Sets up Web3 wallet connectivity with wagmi, viem, and RainbowKit
 * Configured for Polygon Amoy testnet with Alchemy as the RPC provider
 * Also supports local Hardhat network for development
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy, hardhat } from 'wagmi/chains';
import { http } from 'viem';

// Get configuration from environment variables
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'temp-local-dev-id';

if (!alchemyApiKey) {
  console.warn('NEXT_PUBLIC_ALCHEMY_API_KEY is not defined. Using public RPC endpoint.');
}

// Determine which chains to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const chains = isDevelopment ? [hardhat, polygonAmoy] : [polygonAmoy];

// Configure wagmi with RainbowKit
export const config = getDefaultConfig({
  appName: 'ChainEquity Dashboard',
  projectId: walletConnectProjectId,
  chains,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [polygonAmoy.id]: http(
      alchemyApiKey
        ? `https://polygon-amoy.g.alchemy.com/v2/${alchemyApiKey}`
        : polygonAmoy.rpcUrls.default.http[0]
    ),
  },
  ssr: true,
});

// Export chains for convenience
export { polygonAmoy, hardhat };
