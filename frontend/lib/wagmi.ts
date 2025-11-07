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
// Use hardhat chain if RPC_URL is set to localhost/hardhat
const useLocalNetwork = process.env.NEXT_PUBLIC_RPC_URL?.includes('localhost') ||
                        process.env.NEXT_PUBLIC_RPC_URL?.includes('127.0.0.1') ||
                        process.env.NEXT_PUBLIC_RPC_URL?.includes('hardhat') ||
                        process.env.NODE_ENV === 'development';
const chains = (useLocalNetwork ? [hardhat, polygonAmoy] : [polygonAmoy]) as any;

// Configure wagmi with RainbowKit
export const config = getDefaultConfig({
  appName: 'ChainEquity Dashboard',
  projectId: walletConnectProjectId,
  chains,
  transports: {
    [hardhat.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'),
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
