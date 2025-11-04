/**
 * Hardhat Ignition deployment module for ChainEquityToken
 * Run with: npx hardhat ignition deploy ignition/modules/ChainEquityDeploy.ts --network localhost
 */

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ChainEquityDeployModule = buildModule("ChainEquityDeployModule", (m) => {
  // Get the deployer account
  const deployer = m.getAccount(0);

  // Deploy ChainEquityToken
  const token = m.contract("ChainEquityToken", [
    "ChainEquity",        // name
    "CEQ",                // symbol
    deployer,             // initialOwner
  ]);

  return { token };
});

export default ChainEquityDeployModule;
