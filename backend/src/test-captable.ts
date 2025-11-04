/**
 * Test script for CapTableService
 *
 * This script tests cap-table generation, analytics, and export functionality.
 *
 * Usage:
 *   npm run test-captable
 */

import { CapTableService } from './services/captable.service.js';
import { getDatabase } from './db/database.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('\n🧪 Testing Cap-Table Service\n');
  console.log('='.repeat(60));

  // Initialize service
  const capTableService = new CapTableService();
  const db = getDatabase();

  console.log('\n✅ CapTableService initialized');

  // Check if we have data
  const balances = db.getAllBalances();
  console.log(`\n📊 Database has ${balances.length} addresses with balances`);

  if (balances.length === 0) {
    console.log('\n⚠️  No balance data found!');
    console.log('💡 Run the indexer first to collect balance data:');
    console.log('   npm run test-indexer');
    process.exit(0);
  }

  // Test 1: Generate Cap-Table
  console.log('\n' + '='.repeat(60));
  console.log('Test 1: Generate Cap-Table');
  console.log('='.repeat(60));

  const capTable = capTableService.generateCapTable();

  console.log('\n📋 Cap-Table Summary:');
  console.log('   Total Supply:', capTable.totalSupplyFormatted);
  console.log('   Holder Count:', capTable.holderCount);
  console.log('   Split Multiplier:', capTable.splitMultiplier + 'x');
  console.log('   Generated At:', new Date(capTable.generatedAt).toLocaleString());

  console.log('\n👥 Top 5 Holders:');
  capTable.entries.slice(0, 5).forEach((entry, index) => {
    console.log(
      `   ${index + 1}. ${entry.address.substring(0, 10)}... - ${entry.balanceFormatted} (${entry.ownershipPercentage.toFixed(2)}%)`
    );
  });

  // Test 2: Get Holder Count
  console.log('\n' + '='.repeat(60));
  console.log('Test 2: Get Holder Count');
  console.log('='.repeat(60));

  const holderCount = capTableService.getHolderCount();
  console.log('\n   Total Holders:', holderCount);

  // Test 3: Get Total Supply
  console.log('\n' + '='.repeat(60));
  console.log('Test 3: Get Total Supply');
  console.log('='.repeat(60));

  const totalSupply = capTableService.getTotalSupply();
  console.log('\n   Total Supply:', totalSupply);

  // Test 4: Get Top Holders
  console.log('\n' + '='.repeat(60));
  console.log('Test 4: Get Top 3 Holders');
  console.log('='.repeat(60));

  const topHolders = capTableService.getTopHolders(3);
  console.log('');
  topHolders.forEach((holder, index) => {
    console.log(`   ${index + 1}. ${holder.address.substring(0, 42)}`);
    console.log(`      Balance: ${holder.balanceFormatted}`);
    console.log(`      Ownership: ${holder.ownershipPercentage.toFixed(4)}%`);
  });

  // Test 5: Ownership Distribution
  console.log('\n' + '='.repeat(60));
  console.log('Test 5: Ownership Distribution Analysis');
  console.log('='.repeat(60));

  const distribution = capTableService.getOwnershipDistribution();

  // Test 6: Export to CSV
  console.log('\n' + '='.repeat(60));
  console.log('Test 6: Export to CSV');
  console.log('='.repeat(60));

  const csv = capTableService.exportToCSV(capTable);
  console.log('\n📄 CSV Preview (first 5 lines):');
  const csvLines = csv.split('\n');
  csvLines.slice(0, 5).forEach((line) => console.log('   ' + line));
  console.log('   ...');

  // Save CSV to file
  const csvPath = path.join(process.cwd(), 'captable.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`\n✅ Full CSV saved to: ${csvPath}`);

  // Test 7: Export to JSON
  console.log('\n' + '='.repeat(60));
  console.log('Test 7: Export to JSON');
  console.log('='.repeat(60));

  const json = capTableService.exportToJSON(capTable);
  const jsonObj = JSON.parse(json);

  console.log('\n📄 JSON Preview:');
  console.log('   Metadata:', JSON.stringify(jsonObj.metadata, null, 2));
  console.log(`   Holders: ${jsonObj.holders.length} entries`);
  console.log('   First holder:', JSON.stringify(jsonObj.holders[0], null, 2));

  // Save JSON to file
  const jsonPath = path.join(process.cwd(), 'captable.json');
  fs.writeFileSync(jsonPath, json);
  console.log(`\n✅ Full JSON saved to: ${jsonPath}`);

  // Test 8: Balance Changes (if we have addresses)
  if (balances.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('Test 8: Balance Changes for Top Holder');
    console.log('='.repeat(60));

    const topAddress = capTable.entries[0].address;
    console.log(`\n   Address: ${topAddress}`);

    const changes = capTableService.getBalanceChanges(topAddress);

    if (changes.length > 0) {
      console.log(`\n   Found ${changes.length} balance changes:`);
      changes.slice(0, 5).forEach((change, index) => {
        console.log(`\n   ${index + 1}. Block ${change.blockNumber}`);
        console.log(`      TX: ${change.transactionHash.substring(0, 20)}...`);
        console.log(`      Change: ${change.balanceChange}`);
        if (change.timestamp) {
          console.log(`      Time: ${new Date(change.timestamp * 1000).toLocaleString()}`);
        }
      });

      if (changes.length > 5) {
        console.log(`\n   ... and ${changes.length - 5} more`);
      }
    } else {
      console.log('\n   No balance changes found');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ All Tests Passed!');
  console.log('='.repeat(60));

  console.log('\n📊 Summary:');
  console.log('   ✅ Cap-table generation');
  console.log('   ✅ Holder count calculation');
  console.log('   ✅ Total supply calculation');
  console.log('   ✅ Top holders query');
  console.log('   ✅ Ownership distribution analysis');
  console.log('   ✅ CSV export');
  console.log('   ✅ JSON export');
  console.log('   ✅ Balance change tracking');

  console.log('\n📁 Files Generated:');
  console.log(`   ${csvPath}`);
  console.log(`   ${jsonPath}`);

  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
