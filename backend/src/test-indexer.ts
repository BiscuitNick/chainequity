/**
 * Test script for IndexerService
 *
 * This script tests the Event Indexer against a local or testnet deployment.
 *
 * Usage:
 *   npm run test-indexer
 *
 * Prerequisites:
 *   - .env file configured with TOKEN_CONTRACT_ADDRESS and ALCHEMY_API_KEY
 *   - Contract deployed and generating events
 */

import { IndexerService } from './services/indexer.service.js';
import { getDatabase } from './db/database.js';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

async function main() {
  console.log('\n🧪 Testing Event Indexer\n');
  console.log('='.repeat(60));

  // Verify configuration
  if (!process.env.TOKEN_CONTRACT_ADDRESS) {
    console.error('❌ TOKEN_CONTRACT_ADDRESS not set in .env');
    console.log('\n💡 Set it after deploying:');
    console.log('   TOKEN_CONTRACT_ADDRESS=0x...');
    process.exit(1);
  }

  if (!process.env.ALCHEMY_API_KEY) {
    console.error('❌ ALCHEMY_API_KEY not set in .env');
    console.log('\n💡 Get a free API key at: https://www.alchemy.com/');
    process.exit(1);
  }

  console.log('\n📋 Configuration:');
  console.log('   Contract:', process.env.TOKEN_CONTRACT_ADDRESS);
  console.log('   Network: Polygon Amoy');
  console.log('   Alchemy API Key:', process.env.ALCHEMY_API_KEY.substring(0, 10) + '...');

  // Initialize database
  const db = getDatabase();
  console.log('\n✅ Database initialized');

  // Show current database state
  console.log('\n📊 Current Database State:');
  const events = db.getEventsByType('Transfer');
  const balances = db.getAllBalances();
  console.log(`   Events stored: ${events.length}`);
  console.log(`   Addresses tracked: ${balances.length}`);

  // Create indexer service
  const wsUrl = `wss://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const rpcUrl = `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  const indexer = new IndexerService({
    rpcUrl,
    wsUrl,
    contractAddress: process.env.TOKEN_CONTRACT_ADDRESS,
    startBlock: process.env.START_BLOCK ? parseInt(process.env.START_BLOCK) : undefined,
  });

  console.log('\n🚀 Starting indexer...');
  console.log('   Press Ctrl+C to stop\n');

  try {
    await indexer.start();

    // Show status every 10 seconds
    setInterval(() => {
      const status = indexer.getStatus();
      const now = new Date().toLocaleTimeString();

      console.log(`\n[${now}] Indexer Status:`);
      console.log('   Running:', status.isRunning ? '✅' : '❌');
      console.log('   Connection:', status.hasConnection ? '✅' : '❌');
      console.log('   Reconnect attempts:', status.reconnectAttempts);

      // Show latest events
      const latestEvents = db.getEventsByType('Transfer').slice(-5);
      if (latestEvents.length > 0) {
        console.log(`\n   Latest ${latestEvents.length} Transfer events:`);
        latestEvents.forEach((event) => {
          console.log(
            `   - Block ${event.block_number}: ${event.from_address?.substring(0, 10)}... → ${event.to_address?.substring(0, 10)}...`
          );
        });
      }

      // Show balance count
      const currentBalances = db.getAllBalances();
      console.log(`\n   Total addresses tracked: ${currentBalances.length}`);
    }, 10000);

    // Keep running
    await new Promise(() => {});
  } catch (error: any) {
    console.error('\n❌ Indexer failed:', error.message);
    process.exit(1);
  }

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Stopping indexer...');
    await indexer.stop();
    process.exit(0);
  });
}

main();
