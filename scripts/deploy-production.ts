/**
 * Production deployment script for ChainEquityToken
 * Supports multiple networks and saves deployment info
 *
 * Usage:
 *   Local:    npx hardhat run scripts/deploy-production.ts --network localhost
 *   Testnet:  npx hardhat run scripts/deploy-production.ts --network polygonAmoy
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Load the compiled contract
function getContractArtifact() {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts/contracts/ChainEquityToken.sol/ChainEquityToken.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Contract not compiled. Run: npx hardhat compile");
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

// Get network configuration
function getNetworkConfig(networkName: string) {
  const configs: Record<string, { rpcUrl: string; chainId: number }> = {
    localhost: {
      rpcUrl: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    polygonAmoy: {
      rpcUrl: process.env.ALCHEMY_API_KEY
        ? `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : "",
      chainId: 80002,
    },
  };

  const config = configs[networkName];
  if (!config || !config.rpcUrl) {
    throw new Error(
      `Network ${networkName} not supported or missing configuration`
    );
  }

  return config;
}

// Save deployment info to .env
function saveDeploymentInfo(
  contractAddress: string,
  networkName: string,
  txHash: string,
  blockNumber: number
) {
  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add CONTRACT_ADDRESS
  const addressRegex = /^TOKEN_CONTRACT_ADDRESS=.*/m;
  const newAddressLine = `TOKEN_CONTRACT_ADDRESS=${contractAddress}`;

  if (addressRegex.test(envContent)) {
    envContent = envContent.replace(addressRegex, newAddressLine);
  } else {
    envContent += `\n${newAddressLine}\n`;
  }

  // Write back to .env
  fs.writeFileSync(envPath, envContent);

  // Also save detailed deployment info
  const deploymentInfo = {
    contractAddress,
    network: networkName,
    transactionHash: txHash,
    blockNumber,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${networkName}-deployment.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n📝 Deployment info saved to:`);
  console.log(`   .env (TOKEN_CONTRACT_ADDRESS)`);
  console.log(`   ${deploymentFile}`);
}

async function main() {
  console.log("\n🚀 Deploying ChainEquityToken\n");
  console.log("=".repeat(60));

  // Get network name from Hardhat
  const networkName = process.env.HARDHAT_NETWORK || "localhost";
  const networkConfig = getNetworkConfig(networkName);

  console.log("\n📡 Network Info:");
  console.log("   Network:", networkName);
  console.log("   Chain ID:", networkConfig.chainId);
  console.log("   RPC URL:", networkConfig.rpcUrl);

  // Connect to network
  let provider: ethers.JsonRpcProvider;
  let deployer: ethers.Wallet | ethers.JsonRpcSigner;

  if (networkName === "localhost") {
    // Use local signer for localhost
    provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    deployer = await provider.getSigner(0);
  } else {
    // Use private key for testnet/mainnet
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
    }

    provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  }

  const deployerAddress = await deployer.getAddress();

  console.log("\n👤 Deployer Account:");
  console.log("   Address:", deployerAddress);

  const balance = await provider.getBalance(deployerAddress);
  console.log("   Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      "Deployer account has zero balance. Please fund it with test ETH."
    );
  }

  // Load contract artifact
  const artifact = getContractArtifact();

  // Create contract factory
  const ContractFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  // Deployment parameters
  const tokenName = "ChainEquity";
  const tokenSymbol = "CEQ";

  console.log("\n📝 Deployment Parameters:");
  console.log("   Name:", tokenName);
  console.log("   Symbol:", tokenSymbol);
  console.log("   Initial Owner:", deployerAddress);

  // Estimate deployment gas
  console.log("\n⛽ Estimating gas...");
  const deployTx = await ContractFactory.getDeployTransaction(
    tokenName,
    tokenSymbol,
    deployerAddress
  );
  const gasEstimate = await provider.estimateGas(deployTx);
  console.log("   Estimated gas:", gasEstimate.toString());

  // Get gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  console.log("   Gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

  const estimatedCost = gasEstimate * gasPrice;
  console.log(
    "   Estimated cost:",
    ethers.formatEther(estimatedCost),
    "ETH"
  );

  // Deploy contract
  console.log("\n🚢 Deploying contract...");
  const token = await ContractFactory.deploy(
    tokenName,
    tokenSymbol,
    deployerAddress
  );

  console.log("   Transaction submitted:", token.deploymentTransaction()?.hash);
  console.log("   Waiting for confirmation...");

  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const deployTxReceipt = await token.deploymentTransaction()?.wait();

  console.log("\n✅ Contract Deployed!");
  console.log("=".repeat(60));
  console.log("\n📋 Deployment Details:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Transaction Hash:", deployTxReceipt?.hash);
  console.log("   Block Number:", deployTxReceipt?.blockNumber);
  console.log("   Gas Used:", deployTxReceipt?.gasUsed.toString());
  console.log("   Deployer:", deployerAddress);
  console.log("   Network:", networkName);

  // Save deployment info
  if (deployTxReceipt) {
    saveDeploymentInfo(
      contractAddress,
      networkName,
      deployTxReceipt.hash,
      deployTxReceipt.blockNumber
    );
  }

  // Verify basic functionality
  console.log("\n🧪 Verifying deployment:");
  const name = await token.name();
  const symbol = await token.symbol();
  const owner = await token.owner();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Owner:", owner);

  // Next steps
  console.log("\n" + "=".repeat(60));
  console.log("✅ Deployment Complete!");
  console.log("=".repeat(60));

  if (networkName === "polygonAmoy") {
    console.log("\n💡 Next Steps:");
    console.log("\n1. Verify contract on Polygonscan:");
    console.log(
      `   npx hardhat run scripts/verify.ts --network ${networkName}`
    );
    console.log("\n2. View on Polygonscan:");
    console.log(
      `   https://amoy.polygonscan.com/address/${contractAddress}`
    );
    console.log("\n3. Update backend .env:");
    console.log(`   TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    console.log("\n💡 Test the IssuerService:");
    console.log("   cd backend");
    console.log(
      `   npm run test-issuer -- ${contractAddress} ${
        process.env.DEPLOYER_PRIVATE_KEY || "0xac0974..."
      }`
    );
  }

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
