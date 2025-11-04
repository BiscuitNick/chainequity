/**
 * Test script for IndexerService - LOCAL VERSION
 *
 * This script tests the Event Indexer against a local Hardhat node.
 *
 * Usage:
 *   npm run test-indexer-local
 *
 * Prerequisites:
 *   - Hardhat node running: npx hardhat node
 *   - Contract deployed: npx hardhat run scripts/deploy-production.ts --network localhost
 *   - Some transactions executed (minting, transfers)
 */

import { ethers } from 'ethers';
import { getDatabase } from './db/database.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment
dotenv.config();

async function main() {
  console.log('\n🧪 Testing Event Indexer (Local)\n');
  console.log('='.repeat(60));

  // Verify configuration
  if (!process.env.TOKEN_CONTRACT_ADDRESS) {
    console.error('❌ TOKEN_CONTRACT_ADDRESS not set in .env');
    console.log('\n💡 Deploy first:');
    console.log('   npx hardhat run scripts/deploy-production.ts --network localhost');
    process.exit(1);
  }

  const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';

  console.log('\n📋 Configuration:');
  console.log('   Contract:', contractAddress);
  console.log('   Network: Local Hardhat');
  console.log('   RPC URL:', rpcUrl);

  // Initialize database
  const db = getDatabase();
  console.log('\n✅ Database initialized');

  // Show current database state
  console.log('\n📊 Current Database State:');
  const existingEvents = db.getEventsByType('Transfer');
  const existingBalances = db.getAllBalances();
  console.log(`   Events stored: ${existingEvents.length}`);
  console.log(`   Addresses tracked: ${existingBalances.length}`);

  // Connect to local provider
  console.log('\n📡 Connecting to local Hardhat node...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const network = await provider.getNetwork();
    console.log(
      '✅ Connected to network:',
      network.name,
      '(chainId:',
      network.chainId.toString() + ')'
    );
  } catch (error) {
    console.error('❌ Failed to connect to Hardhat node');
    console.error('   Make sure Hardhat node is running: npx hardhat node');
    process.exit(1);
  }

  // Load contract ABI
  const artifactPath = path.join(
    process.cwd(),
    '../artifacts/contracts/ChainEquityToken.sol/ChainEquityToken.json'
  );

  if (!fs.existsSync(artifactPath)) {
    console.error('❌ Contract artifact not found');
    console.error('   Run: npx hardhat compile');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

  // Verify contract exists
  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log('\n✅ Contract verified:');
    console.log('   Name:', name);
    console.log('   Symbol:', symbol);
  } catch (error) {
    console.error('❌ Contract not found at address');
    console.error('   Redeploy: npx hardhat run scripts/deploy-production.ts --network localhost');
    process.exit(1);
  }

  // Fetch historical events
  console.log('\n🔍 Fetching historical events...');
  const currentBlock = await provider.getBlockNumber();
  console.log('   Current block:', currentBlock);

  // Get all event types
  console.log('\n📥 Fetching all events...');

  const transferFilter = contract.filters.Transfer();
  const transferEvents = await contract.queryFilter(transferFilter, 0, currentBlock);
  console.log(`   Found ${transferEvents.length} Transfer events`);

  const splitFilter = contract.filters.StockSplit();
  const splitEvents = await contract.queryFilter(splitFilter, 0, currentBlock);
  console.log(`   Found ${splitEvents.length} StockSplit events`);

  const symbolFilter = contract.filters.SymbolChanged();
  const symbolEvents = await contract.queryFilter(symbolFilter, 0, currentBlock);
  console.log(`   Found ${symbolEvents.length} SymbolChanged events`);

  const walletApprovedFilter = contract.filters.WalletApproved();
  const walletApprovedEvents = await contract.queryFilter(walletApprovedFilter, 0, currentBlock);
  console.log(`   Found ${walletApprovedEvents.length} WalletApproved events`);

  if (transferEvents.length === 0) {
    console.log('\n⚠️  No Transfer events found');
    console.log('💡 Mint some tokens first:');
    console.log('   npm run cli token mint 0xYourAddress 1000');
  }

  // Process each Transfer event
  let processedCount = 0;
  let skippedCount = 0;
  const addressSet = new Set<string>();

  for (const event of transferEvents) {
    // Type guard for EventLog
    if (!('args' in event)) continue;

    // Check if event already exists in database
    const existingEvent = db.getEventByTxHash(event.transactionHash);
    if (existingEvent) {
      skippedCount++;

      // Still track addresses for balance updates
      const from = event.args[0] as string;
      const to = event.args[1] as string;
      if (from !== ethers.ZeroAddress) addressSet.add(from.toLowerCase());
      if (to !== ethers.ZeroAddress) addressSet.add(to.toLowerCase());

      continue;
    }

    const block = await event.getBlock();
    const from = event.args[0] as string;
    const to = event.args[1] as string;
    const value = event.args[2] as bigint;

    console.log(
      `\n   📝 Block ${event.blockNumber} - TX ${event.transactionHash.substring(0, 10)}...`
    );
    console.log(`      From: ${from.substring(0, 10)}...`);
    console.log(`      To: ${to.substring(0, 10)}...`);
    console.log(`      Amount: ${ethers.formatEther(value)}`);

    // Store event in database
    db.insertEvent({
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      event_type: 'Transfer',
      from_address: from,
      to_address: to,
      amount: value.toString(),
      data: JSON.stringify({ from, to, value: value.toString() }),
      timestamp: block.timestamp,
    });

    // Track addresses
    if (from !== ethers.ZeroAddress) addressSet.add(from.toLowerCase());
    if (to !== ethers.ZeroAddress) addressSet.add(to.toLowerCase());

    processedCount++;
  }

  if (skippedCount > 0) {
    console.log(`\n   ⏭️  Skipped ${skippedCount} existing Transfer events`);
  }

  console.log(`\n✅ Processed ${processedCount} new Transfer events`);

  // Process StockSplit events
  console.log(`\n📈 Processing StockSplit events...`);
  let splitCount = 0;

  for (const event of splitEvents) {
    if (!('args' in event)) continue;

    const existingEvent = db.getEventByTxHash(event.transactionHash);
    if (existingEvent) continue;

    const block = await event.getBlock();
    const multiplierBP = event.args[0] as bigint;
    const newMultiplierBP = event.args[1] as bigint;

    console.log(`\n   📝 Block ${event.blockNumber} - Split: ${Number(multiplierBP) / 10000}x`);

    db.insertEvent({
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      event_type: 'StockSplit',
      from_address: null,
      to_address: null,
      amount: null,
      data: JSON.stringify({
        multiplier: multiplierBP.toString(),
        newSplitMultiplier: newMultiplierBP.toString(),
      }),
      timestamp: block.timestamp,
    });

    db.insertCorporateAction({
      action_type: 'StockSplit',
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      old_value: multiplierBP.toString(),
      new_value: newMultiplierBP.toString(),
      timestamp: block.timestamp,
    });

    splitCount++;
  }

  console.log(`✅ Processed ${splitCount} new StockSplit events`);

  // Update split multiplier in metadata (get latest from contract)
  if (splitEvents.length > 0) {
    const currentMultiplier = await contract.getSplitMultiplier();
    db.setMetadata('split_multiplier', currentMultiplier.toString());
    console.log(`   Updated split multiplier: ${Number(currentMultiplier) / 10000}x`);
  }

  // Process SymbolChanged events
  console.log(`\n🏷️  Processing SymbolChanged events...`);
  let symbolCount = 0;

  for (const event of symbolEvents) {
    if (!('args' in event)) continue;

    const existingEvent = db.getEventByTxHash(event.transactionHash);
    if (existingEvent) continue;

    const block = await event.getBlock();
    const oldSymbol = event.args[0] as string;
    const newSymbol = event.args[1] as string;

    console.log(`\n   📝 Block ${event.blockNumber} - Symbol: ${oldSymbol} → ${newSymbol}`);

    db.insertEvent({
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      event_type: 'SymbolChanged',
      from_address: null,
      to_address: null,
      amount: null,
      data: JSON.stringify({ oldSymbol, newSymbol }),
      timestamp: block.timestamp,
    });

    db.insertCorporateAction({
      action_type: 'SymbolChange',
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      old_value: oldSymbol,
      new_value: newSymbol,
      timestamp: block.timestamp,
    });

    symbolCount++;
  }

  console.log(`✅ Processed ${symbolCount} new SymbolChanged events`);

  // Process WalletApproved events
  console.log(`\n✅ Processing WalletApproved events...`);
  let approvalCount = 0;

  for (const event of walletApprovedEvents) {
    if (!('args' in event)) continue;

    const existingEvent = db.getEventByTxHash(event.transactionHash);
    if (existingEvent) continue;

    const block = await event.getBlock();
    const wallet = event.args[0] as string;

    db.insertEvent({
      block_number: event.blockNumber,
      transaction_hash: event.transactionHash,
      event_type: 'WalletApproved',
      from_address: wallet,
      to_address: null,
      amount: null,
      data: JSON.stringify({ wallet }),
      timestamp: block.timestamp,
    });

    addressSet.add(wallet.toLowerCase());
    approvalCount++;
  }

  console.log(`✅ Processed ${approvalCount} new WalletApproved events`);

  // Update balances for all addresses
  console.log(`\n💰 Updating balances for ${addressSet.size} addresses...`);

  for (const address of addressSet) {
    const balance = await contract.balanceOf(address);

    db.upsertBalance({
      address: address.toLowerCase(),
      balance: balance.toString(),
      last_updated_block: currentBlock,
      last_updated_timestamp: Date.now(),
    });

    console.log(`   ${address.substring(0, 10)}...: ${ethers.formatEther(balance)}`);
  }

  // Final database state
  console.log('\n' + '='.repeat(60));
  console.log('📊 Final Database State:');
  const finalEvents = db.getEventsByType('Transfer');
  const finalBalances = db.getAllBalances();
  console.log(`   Events stored: ${finalEvents.length}`);
  console.log(`   Addresses tracked: ${finalBalances.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Indexing Complete!');
  console.log('='.repeat(60));

  console.log('\n💡 Now you can use:');
  console.log('   npm run cli captable');
  console.log('   npm run cli analytics');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Indexer test failed:');
    console.error(error);
    process.exit(1);
  });
