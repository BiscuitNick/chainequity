import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Turbopack configuration for Web3 compatibility
  turbopack: {
    resolveAlias: {
      // Turbopack handles Node.js polyfills automatically
      // No additional configuration needed for most Web3 libraries
    },
  },

  // Keep webpack config for fallback if needed
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
