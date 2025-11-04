/**
 * Simple deployment script using ethers.js
 * Works with Hardhat 3.0
 *
 * Usage: npx hardhat run scripts/deploy.ts --network localhost
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

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

async function main() {
  console.log("\n🚀 Deploying ChainEquityToken\n");
  console.log("=".repeat(60));

  // Connect to network
  const networkName = process.env.HARDHAT_NETWORK || "localhost";
  let provider: ethers.JsonRpcProvider;

  if (networkName === "localhost") {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  } else {
    throw new Error("Only localhost network supported in this script");
  }

  console.log("\n📡 Network Info:");
  console.log("   Network:", networkName);
  console.log("   RPC URL:", provider._getConnection().url);

  // Get deployer account
  const deployer = await provider.getSigner(0);
  const deployerAddress = await deployer.getAddress();

  console.log("\n👤 Deployer Account:");
  console.log("   Address:", deployerAddress);
  const balance = await provider.getBalance(deployerAddress);
  console.log("   Balance:", ethers.formatEther(balance), "ETH");

  // Load contract artifact
  const artifact = getContractArtifact();

  // Create contract factory
  const ContractFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  // Deploy contract
  console.log("\n📝 Deploying Contract:");
  console.log("   Name: ChainEquity");
  console.log("   Symbol: CEQ");
  console.log("   Owner:", deployerAddress);

  const token = await ContractFactory.deploy(
    "ChainEquity",
    "CEQ",
    deployerAddress
  );

  console.log("\n⏳ Waiting for deployment...");
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();

  console.log("\n✅ Contract Deployed!");
  console.log("=".repeat(60));
  console.log("\n📋 Deployment Details:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Deployer:", deployerAddress);
  console.log("   Network:", networkName);

  // Test basic functionality
  console.log("\n🧪 Testing Basic Functions:");
  console.log("-".repeat(60));

  const name = await token.name();
  const symbol = await token.symbol();
  const decimals = await token.decimals();
  const owner = await token.owner();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Owner:", owner);

  // Get test addresses
  const addr1Signer = await provider.getSigner(1);
  const addr2Signer = await provider.getSigner(2);
  const addr1 = await addr1Signer.getAddress();
  const addr2 = await addr2Signer.getAddress();

  // Approve wallets
  console.log("\n👥 Approving Test Wallets:");
  console.log("-".repeat(60));

  console.log("   Approving addr1:", addr1);
  const approve1Tx = await token.approveWallet(addr1);
  await approve1Tx.wait();
  console.log("   ✅ Approved addr1");

  console.log("   Approving addr2:", addr2);
  const approve2Tx = await token.approveWallet(addr2);
  await approve2Tx.wait();
  console.log("   ✅ Approved addr2");

  // Mint tokens
  console.log("\n💰 Minting Tokens:");
  console.log("-".repeat(60));

  const mintAmount = ethers.parseEther("10000");
  console.log("   Minting 10,000 tokens to addr1...");

  const mintTx = await token.mint(addr1, mintAmount);
  const mintReceipt = await mintTx.wait();
  console.log("   ✅ Minted! Gas used:", mintReceipt?.gasUsed.toString());

  const balance1 = await token.balanceOf(addr1);
  console.log("   Addr1 balance:", ethers.formatEther(balance1), symbol);

  // Test transfer
  console.log("\n🔄 Testing Transfer:");
  console.log("-".repeat(60));

  const tokenAsAddr1 = token.connect(addr1Signer);

  const transferAmount = ethers.parseEther("100");
  console.log("   Transferring 100 tokens from addr1 to addr2...");

  const transferTx = await tokenAsAddr1.transfer(addr2, transferAmount);
  await transferTx.wait();
  console.log("   ✅ Transferred!");

  const balance2 = await token.balanceOf(addr2);
  console.log("   Addr2 balance:", ethers.formatEther(balance2), symbol);

  const balance1After = await token.balanceOf(addr1);
  console.log("   Addr1 balance:", ethers.formatEther(balance1After), symbol);

  // Test stock split
  console.log("\n📈 Testing Stock Split (7-for-1):");
  console.log("-".repeat(60));

  console.log("   Balance before split:", ethers.formatEther(balance1After), symbol);

  const splitTx = await token.executeSplit(7);
  await splitTx.wait();
  console.log("   ✅ Split executed!");

  const balance1AfterSplit = await token.balanceOf(addr1);
  const balance2AfterSplit = await token.balanceOf(addr2);

  console.log("   Addr1 balance after:", ethers.formatEther(balance1AfterSplit), symbol);
  console.log("   Addr2 balance after:", ethers.formatEther(balance2AfterSplit), symbol);

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ All Tests Passed!");
  console.log("=".repeat(60));

  console.log("\n💡 Next Steps:");
  console.log("\n1. Test the IssuerService:");
  console.log("   cd backend");
  console.log(`   npm run test-issuer -- ${contractAddress} 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);

  console.log("\n2. Or use the contract in your own scripts:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);

  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
