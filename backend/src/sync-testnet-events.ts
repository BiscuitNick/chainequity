#!/usr/bin/env node

/**
 * One-time Historical Event Sync for Testnet
 *
 * This script syncs all historical events from the testnet contract deployment
 * to the current block. Run this once to populate the database with past events.
 *
 * Usage: npm run build && node dist/sync-testnet-events.js
 */

import { createIndexerService } from './services/indexer.service.js';
import { config } from './config/env.js';
import { ethers } from 'ethers';

async function main() {
  console.log('\n🔄 ChainEquity Testnet Historical Event Sync');
  console.log('='.repeat(70));
  console.log('Contract Address:', config.tokenContractAddress);
  console.log('Network:', config.useLocalNetwork ? 'Local' : 'Polygon Amoy Testnet');
  console.log('='.repeat(70));

  if (config.useLocalNetwork) {
    console.error('❌ This script is for testnet only. For local development, use AUTO_INDEX=true instead.');
    process.exit(1);
  }

  if (!config.tokenContractAddress) {
    console.error('❌ TOKEN_CONTRACT_ADDRESS not set in environment');
    process.exit(1);
  }

  if (!config.alchemyApiKey) {
    console.error('❌ ALCHEMY_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Get contract deployment block by querying the first transaction
    console.log('\n📡 Connecting to Polygon Amoy...');
    const provider = new ethers.JsonRpcProvider(
      `https://polygon-amoy.g.alchemy.com/v2/${config.alchemyApiKey}`
    );

    // Try to get the deployment block from the contract's first transaction
    // For Polygon Amoy, we'll start from a recent block to be safe
    // You can adjust this to the actual deployment block if known
    const currentBlock = await provider.getBlockNumber();

    // Default to syncing from 1000 blocks ago, or you can specify the exact deployment block
    const deploymentBlock = process.env.DEPLOYMENT_BLOCK
      ? parseInt(process.env.DEPLOYMENT_BLOCK)
      : Math.max(0, currentBlock - 10000); // Look back 10k blocks max

    console.log(`📚 Current block: ${currentBlock}`);
    console.log(`📚 Starting sync from block: ${deploymentBlock}`);
    console.log(`📦 Blocks to process: ${currentBlock - deploymentBlock}`);
    console.log('');

    // Create indexer service
    const indexer = createIndexerService();

    // Start indexer (without event listeners yet)
    await indexer.start();

    // Sync historical events
    console.log('⏳ This may take a few minutes depending on the number of blocks...\n');
    await indexer.syncHistoricalEvents(deploymentBlock);

    console.log('\n✅ Historical event sync completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start the backend: npm start');
    console.log('   2. In a new terminal, start the indexer: npm run dev:indexer');
    console.log('   3. The indexer will now listen for new events in real-time\n');

    await indexer.stop();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Sync interrupted. You can run this script again to resume.');
  process.exit(130);
});

main();
