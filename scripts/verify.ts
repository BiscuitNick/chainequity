/**
 * Contract verification script for Polygonscan
 *
 * Usage:
 *   npx hardhat run scripts/verify.ts --network polygonAmoy
 *
 * Or verify specific address:
 *   npx hardhat run scripts/verify.ts --network polygonAmoy -- <CONTRACT_ADDRESS>
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

// Sleep utility for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get contract address from deployment file or argument
function getContractAddress(networkName: string): string {
  // Check command line argument first
  const cliAddress = process.argv[2];
  if (cliAddress && cliAddress.startsWith('0x')) {
    console.log(`Using contract address from CLI: ${cliAddress}`);
    return cliAddress;
  }

  // Try to read from deployment file
  const deploymentFile = path.join(process.cwd(), 'deployments', `${networkName}-deployment.json`);

  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log(`Using contract address from deployment file: ${deployment.contractAddress}`);
    return deployment.contractAddress;
  }

  // Try .env file
  if (process.env.TOKEN_CONTRACT_ADDRESS) {
    console.log(`Using contract address from .env: ${process.env.TOKEN_CONTRACT_ADDRESS}`);
    return process.env.TOKEN_CONTRACT_ADDRESS;
  }

  throw new Error('Contract address not found. Please provide it as an argument or deploy first.');
}

// Get deployer address - unused but kept for potential future use
function _getDeployerAddress(): string {
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env');
  }

  // Simple way to get address from private key would require ethers
  // For now, we'll let the user know they need to verify manually
  // Or we can read it from deployment file
  const networkName = process.env.HARDHAT_NETWORK || 'polygonAmoy';
  const deploymentFile = path.join(process.cwd(), 'deployments', `${networkName}-deployment.json`);

  if (fs.existsSync(deploymentFile)) {
    // We don't store deployer in deployment file, so return empty
    // Hardhat verify will figure it out from the transaction
    return '';
  }

  return '';
}

async function main() {
  console.log('\n🔍 Verifying Contract on Polygonscan\n');
  console.log('='.repeat(60));

  const networkName = process.env.HARDHAT_NETWORK || 'polygonAmoy';
  console.log('\n📡 Network:', networkName);

  if (networkName === 'localhost') {
    console.log('❌ Cannot verify contracts on localhost network');
    process.exit(1);
  }

  // Get contract address
  const contractAddress = getContractAddress(networkName);
  console.log('📝 Contract Address:', contractAddress);

  // Get constructor arguments
  // For ChainEquityToken: constructor(string name, string symbol, address initialOwner)
  const deploymentFile = path.join(process.cwd(), 'deployments', `${networkName}-deployment.json`);

  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log('📅 Deployed at:', deployment.deployedAt);
    console.log('📦 Block:', deployment.blockNumber);
    console.log('🔗 TX:', deployment.transactionHash);
  }

  console.log('\n📋 Constructor Arguments:');
  console.log('   name: "ChainEquity"');
  console.log('   symbol: "CEQ"');
  console.log('   initialOwner: <deployer address>');

  // Retry configuration
  const maxAttempts = 3;
  const retryDelays = [5000, 10000, 20000]; // 5s, 10s, 20s

  console.log('\n⏳ Starting verification with retry logic...');
  console.log(`   Max attempts: ${maxAttempts}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}`);

      // Run Hardhat verify command
      const command = `npx hardhat verify --network ${networkName} ${contractAddress} "ChainEquity" "CEQ"`;
      console.log(`   Running: ${command}`);

      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      console.log('\n✅ Verification successful!');
      console.log(output);

      // Check if already verified
      if (output.includes('Already Verified')) {
        console.log('\n📝 Contract was already verified');
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ Verification Complete!');
      console.log('='.repeat(60));

      if (networkName === 'polygonAmoy') {
        console.log('\n🔗 View on Polygonscan:');
        console.log(`   https://amoy.polygonscan.com/address/${contractAddress}#code`);
      }

      console.log('');
      return;
    } catch (error: any) {
      const errorMessage = error.message || error.toString();

      // Check for specific errors
      if (errorMessage.includes('Already Verified')) {
        console.log('\n✅ Contract is already verified!');
        console.log('\n' + '='.repeat(60));

        if (networkName === 'polygonAmoy') {
          console.log('\n🔗 View on Polygonscan:');
          console.log(`   https://amoy.polygonscan.com/address/${contractAddress}#code`);
        }

        console.log('');
        return;
      }

      // Check for rate limiting
      if (errorMessage.includes('rate limit') || errorMessage.includes('Max rate limit reached')) {
        console.log('   ⚠️  Rate limited by Polygonscan API');

        if (attempt < maxAttempts) {
          const delay = retryDelays[attempt - 1];
          console.log(`   Waiting ${delay / 1000}s before retry...`);
          await sleep(delay);
          continue;
        }
      }

      // Check for pending verification
      if (errorMessage.includes('pending')) {
        console.log('   ⏳ Verification is pending on Polygonscan');

        if (attempt < maxAttempts) {
          const delay = retryDelays[attempt - 1];
          console.log(`   Waiting ${delay / 1000}s before retry...`);
          await sleep(delay);
          continue;
        }
      }

      // For last attempt, throw the error
      if (attempt === maxAttempts) {
        console.error('\n❌ Verification failed after all attempts:');
        console.error(errorMessage);

        console.log('\n💡 Manual verification:');
        console.log('   1. Go to Polygonscan:');
        console.log(`      https://amoy.polygonscan.com/address/${contractAddress}#code`);
        console.log('   2. Click "Verify and Publish"');
        console.log('   3. Select:');
        console.log('      Compiler: Solidity (Single file)');
        console.log('      Compiler Version: v0.8.20');
        console.log('      License: MIT');
        console.log('   4. Paste contract source code');
        console.log('   5. Constructor Arguments ABI-encoded:');
        console.log('      "ChainEquity", "CEQ", <deployer_address>');

        throw error;
      }

      console.log(`   ❌ Attempt ${attempt} failed:`, errorMessage);
      const delay = retryDelays[attempt - 1];
      console.log(`   Waiting ${delay / 1000}s before retry...`);
      await sleep(delay);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification script failed:');
    console.error(error.message || error);
    process.exit(1);
  });
