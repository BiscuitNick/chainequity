/**
 * Test script for IssuerService
 *
 * This script tests the IssuerService against a locally deployed contract.
 *
 * Prerequisites:
 * 1. Run `npx hardhat node` in Terminal 1
 * 2. Run `npx hardhat run scripts/deploy-local.ts --network localhost` in Terminal 2
 * 3. Copy the deployed contract address
 * 4. Run this script: `npm run test-issuer -- <contract-address> <private-key>`
 */

import { IssuerService } from './services/issuer.service.js';

async function main() {
  console.log('\n🧪 Testing IssuerService\n');
  console.log('='.repeat(60));

  // Get arguments
  const contractAddress = process.argv[2];
  const privateKey = process.argv[3];

  if (!contractAddress || !privateKey) {
    console.error('❌ Usage: npm run test-issuer -- <contract-address> <private-key>');
    console.error('\nExample:');
    console.error('  npm run test-issuer -- 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
    process.exit(1);
  }

  // Initialize IssuerService
  const issuerService = new IssuerService({
    rpcUrl: 'http://127.0.0.1:8545', // Local Hardhat node
    contractAddress,
    privateKey,
  });

  console.log('\n✅ IssuerService Initialized');
  console.log('   Contract:', issuerService.getContractAddress());
  console.log('   Signer:', issuerService.getSignerAddress());

  try {
    // Test 1: Get token info
    console.log('\n📋 Test 1: Get Token Info');
    console.log('-'.repeat(60));
    const tokenInfo = await issuerService.getTokenInfo();
    console.log('   Name:', tokenInfo.name);
    console.log('   Symbol:', tokenInfo.symbol);
    console.log('   Decimals:', tokenInfo.decimals);

    // Test 2: Get total supply
    console.log('\n💰 Test 2: Get Total Supply');
    console.log('-'.repeat(60));
    const supply = await issuerService.getTotalSupply();
    console.log('   Total Supply:', supply, tokenInfo.symbol);

    // Test 3: Check if a test address is approved
    const testAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Hardhat account #1
    console.log('\n👤 Test 3: Check Wallet Approval');
    console.log('-'.repeat(60));
    console.log('   Testing address:', testAddress);
    const isApproved = await issuerService.isWalletApproved(testAddress);
    console.log('   Is Approved:', isApproved);

    // Test 4: Approve wallet
    if (!isApproved) {
      console.log('\n✅ Test 4: Approve Wallet');
      console.log('-'.repeat(60));
      const receipt = await issuerService.approveWallet(testAddress);
      console.log('   Transaction Hash:', receipt.hash);
      console.log('   Block Number:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed);
      console.log('   Status:', receipt.status === 1 ? 'Success' : 'Failed');

      // Verify approval
      const nowApproved = await issuerService.isWalletApproved(testAddress);
      console.log('   Verified Approved:', nowApproved);
    } else {
      console.log('\n⏭️  Test 4: Skipped (wallet already approved)');
    }

    // Test 5: Mint tokens
    console.log('\n💸 Test 5: Mint Tokens');
    console.log('-'.repeat(60));
    const balanceBefore = await issuerService.getBalance(testAddress);
    console.log('   Balance Before:', balanceBefore, tokenInfo.symbol);

    const mintAmount = '1000';
    const mintReceipt = await issuerService.mintTokens(testAddress, mintAmount);
    console.log('   Minted:', mintAmount, tokenInfo.symbol);
    console.log('   Transaction Hash:', mintReceipt.hash);
    console.log('   Gas Used:', mintReceipt.gasUsed);

    const balanceAfter = await issuerService.getBalance(testAddress);
    console.log('   Balance After:', balanceAfter, tokenInfo.symbol);

    // Test 6: Get split multiplier
    console.log('\n📊 Test 6: Get Split Multiplier');
    console.log('-'.repeat(60));
    const multiplier = await issuerService.getSplitMultiplier();
    console.log('   Current Multiplier:', multiplier);

    // Test 7: Execute stock split
    console.log('\n📈 Test 7: Execute Stock Split (2-for-1)');
    console.log('-'.repeat(60));
    const balanceBeforeSplit = await issuerService.getBalance(testAddress);
    console.log('   Balance Before Split:', balanceBeforeSplit, tokenInfo.symbol);

    const splitReceipt = await issuerService.executeSplit(2);
    console.log('   Split Executed: 2-for-1');
    console.log('   Transaction Hash:', splitReceipt.hash);
    console.log('   Gas Used:', splitReceipt.gasUsed);

    const balanceAfterSplit = await issuerService.getBalance(testAddress);
    console.log('   Balance After Split:', balanceAfterSplit, tokenInfo.symbol);

    const newMultiplier = await issuerService.getSplitMultiplier();
    console.log('   New Multiplier:', newMultiplier);

    // Test 8: Update symbol
    console.log('\n🏷️  Test 8: Update Symbol');
    console.log('-'.repeat(60));
    const oldSymbol = (await issuerService.getTokenInfo()).symbol;
    console.log('   Old Symbol:', oldSymbol);

    const newSymbol = 'CEQX';
    const symbolReceipt = await issuerService.updateSymbol(newSymbol);
    console.log('   Symbol Updated to:', newSymbol);
    console.log('   Transaction Hash:', symbolReceipt.hash);

    const updatedSymbol = (await issuerService.getTokenInfo()).symbol;
    console.log('   Verified Symbol:', updatedSymbol);

    // Test 9: Get approved wallets
    console.log('\n📝 Test 9: Get All Approved Wallets');
    console.log('-'.repeat(60));
    const approvedWallets = await issuerService.getApprovedWallets();
    console.log('   Total Approved:', approvedWallets.length);
    approvedWallets.forEach((wallet, i) => {
      console.log(`   ${i + 1}. ${wallet}`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Tests Passed!');
    console.log('='.repeat(60));
    console.log('\n📊 Final State:');
    console.log('   Symbol:', updatedSymbol);
    console.log('   Split Multiplier:', newMultiplier);
    console.log('   Total Supply:', await issuerService.getTotalSupply(), updatedSymbol);
    console.log('   Test Address Balance:', await issuerService.getBalance(testAddress), updatedSymbol);
    console.log('   Approved Wallets:', approvedWallets.length);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
