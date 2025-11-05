#!/usr/bin/env node

/**
 * Standalone Indexer Runner
 *
 * Run blockchain event indexer as a separate service
 * Usage: node dist/indexer-runner.js
 */

import { createIndexerService } from './services/indexer.service.js';
import { config } from './config/env.js';

let indexer: ReturnType<typeof createIndexerService> | null = null;

/**
 * Start the indexer service
 */
async function main() {
  console.log('\n🎯 ChainEquity Blockchain Indexer');
  console.log('='.repeat(60));
  console.log('Environment:', config.nodeEnv);
  console.log('Network:', config.useLocalNetwork ? 'Local Hardhat' : 'Polygon Amoy');
  console.log('Contract:', config.tokenContractAddress);
  console.log('='.repeat(60));

  try {
    // Validate required configuration
    if (!config.useLocalNetwork && !config.alchemyApiKey) {
      throw new Error('ALCHEMY_API_KEY not set in environment. Set USE_LOCAL_NETWORK=true for local development.');
    }

    if (!config.tokenContractAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS not set in environment');
    }

    // Create and start indexer
    indexer = createIndexerService();
    await indexer.start();

    console.log('🎧 Indexer is now listening for blockchain events...');
    console.log('Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('❌ Failed to start indexer:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  console.log(`\n\n📡 Received ${signal}, shutting down gracefully...`);

  if (indexer) {
    try {
      await indexer.stop();
      console.log('✅ Indexer stopped successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  process.exit(0);
}

// Register signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the indexer
main();
