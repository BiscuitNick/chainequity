/**
 * Debug script to check balance and split multiplier
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error('TOKEN_CONTRACT_ADDRESS not set');
    process.exit(1);
  }

  const address = process.argv[2];
  if (!address) {
    console.error('Usage: npx tsx scripts/check-balance.ts <address>');
    process.exit(1);
  }

  // Connect to local provider
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Load contract
  const artifactPath = path.join(
    process.cwd(),
    'artifacts/contracts/ChainEquityToken.sol/ChainEquityToken.json'
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

  console.log('\n🔍 Balance Debug Info\n');
  console.log('Contract:', contractAddress);
  console.log('Address:', address);
  console.log('='.repeat(60));

  // Get split multiplier
  const splitMultiplier = await contract.getSplitMultiplier();
  console.log('\n📊 Split Multiplier:');
  console.log('   Raw (basis points):', splitMultiplier.toString());
  console.log('   As decimal:', Number(splitMultiplier) / 10000);

  // Get balance (this calls balanceOf which applies the multiplier)
  const balance = await contract.balanceOf(address);
  console.log('\n💰 Balance (with multiplier applied):');
  console.log('   Wei:', balance.toString());
  console.log('   Tokens:', ethers.formatEther(balance));

  // Get the ACTUAL stored balance (before multiplier)
  const abi = ['function balanceOf(address) view returns (uint256)'];
  const erc20 = new ethers.Contract(contractAddress, abi, provider);

  // Call the parent ERC20's balanceOf directly via low-level call
  const slot = ethers.solidityPackedKeccak256(['uint256', 'uint256'], [address, 0]);
  const rawBalanceHex = await provider.getStorage(contractAddress, slot);
  const rawBalance = BigInt(rawBalanceHex);

  console.log('\n🔍 Raw Balance (stored, without multiplier):');
  console.log('   Wei:', rawBalance.toString());
  console.log('   Tokens:', ethers.formatEther(rawBalance));

  // Calculate expected balance
  const expectedBalance = (rawBalance * splitMultiplier) / BigInt(10000);
  console.log('\n🧮 Manual Calculation:');
  console.log('   (Raw Balance * Multiplier) / 10000:');
  console.log('   Wei:', expectedBalance.toString());
  console.log('   Tokens:', ethers.formatEther(expectedBalance));

  console.log('\n✅ Match:', balance.toString() === expectedBalance.toString() ? 'YES' : 'NO');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
