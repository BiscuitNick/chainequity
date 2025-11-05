#!/usr/bin/env node

/**
 * Auto-Indexer Watcher for Local Development
 *
 * Automatically watches for new blocks on local Hardhat node and syncs events.
 * Usage: npm run watch-indexer
 */

import { createAutoIndexerService } from './services/autoIndexer.service.js';
import { config } from './config/env.js';

let autoIndexer: ReturnType<typeof createAutoIndexerService> | null = null;

/**
 * Start the auto-indexer service
 */
async function main() {
  console.log('\n🎯 ChainEquity Auto-Indexer Watcher');
  console.log('='.repeat(60));
  console.log('Environment:', config.nodeEnv);
  console.log('Network: Local Hardhat');
  console.log('RPC URL:', config.localRpcUrl);
  console.log('Contract:', config.tokenContractAddress);
  console.log('='.repeat(60));

  try {
    // Validate configuration
    if (!config.useLocalNetwork) {
      throw new Error(
        'Auto-indexer requires USE_LOCAL_NETWORK=true in environment.\n' +
          'This tool is designed for local development only.'
      );
    }

    if (!config.tokenContractAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS not set in environment');
    }

    // Create and start auto-indexer
    autoIndexer = createAutoIndexerService();
    await autoIndexer.start();

    console.log('🎧 Auto-indexer is now watching for new blocks...');
    console.log('💡 Mine transactions on your local network to see events indexed automatically');
    console.log('Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('❌ Failed to start auto-indexer:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  console.log(`\n\n📡 Received ${signal}, shutting down gracefully...`);

  if (autoIndexer) {
    try {
      await autoIndexer.stop();
      console.log('✅ Auto-indexer stopped successfully');
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

// Start the auto-indexer
main();
