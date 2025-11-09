/**
 * Quick Deploy Script (Using Hardhat Ignition)
 * Simple deployment that works without viem plugin issues
 */

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";

const ChainEquityModule = buildModule("ChainEquityModule", (m) => {
  const tokenName = m.getParameter("tokenName", "ChainEquity");
  const tokenSymbol = m.getParameter("tokenSymbol", "CEQ");

  // Get the deployer address (will be first account)
  const deployer = m.getAccount(0);

  const token = m.contract("ChainEquityToken", [tokenName, tokenSymbol, deployer]);

  return { token };
});

async function main() {
  console.log('\n🚀 Deploying ChainEquityToken using Hardhat Ignition\n');

  const { token } = await hre.ignition.deploy(ChainEquityModule);

  console.log('\n✅ Deployment Complete!');
  console.log('='.repeat(50));
  console.log('Contract Address:', await token.getAddress());
  console.log('='.repeat(50));
  console.log('');
  console.log('📝 Update your .env file with:');
  console.log(`TOKEN_CONTRACT_ADDRESS=${await token.getAddress()}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  });
