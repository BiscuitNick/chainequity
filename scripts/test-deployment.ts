/**
 * Test script after deployment
 * Run after: npx hardhat ignition deploy ignition/modules/ChainEquityDeploy.ts --network localhost
 *
 * Usage: npx hardhat run scripts/test-deployment.ts --network localhost
 */

import { ethers } from "ethers";

const ChainEquityTokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function owner() view returns (address)",
  "function isApproved(address wallet) view returns (bool)",
  "function approveWallet(address wallet)",
  "function mint(address to, uint256 amount)",
  "function executeSplit(uint256 multiplier)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function main() {
  console.log("\n🧪 Testing Deployed ChainEquityToken\n");
  console.log("=".repeat(60));

  // Get contract address from command line
  const contractAddress = process.argv[2] || process.env.TOKEN_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("❌ Please provide contract address:");
    console.error("   npx hardhat run scripts/test-deployment.ts --network localhost -- <CONTRACT_ADDRESS>");
    process.exit(1);
  }

  // Connect to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Get signers
  const [deployer, addr1, addr2] = await provider.listAccounts();
  const deployerSigner = await provider.getSigner(deployer);
  const addr1Signer = await provider.getSigner(addr1);

  console.log("\n📡 Connected to Hardhat node");
  console.log("   Provider:", provider._getConnection().url);
  console.log("   Deployer:", deployer);

  // Connect to contract
  const token = new ethers.Contract(contractAddress, ChainEquityTokenABI, deployerSigner);

  console.log("\n📋 Contract Info:");
  const name = await token.name();
  const symbol = await token.symbol();
  const owner = await token.owner();

  console.log("   Address:", contractAddress);
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Owner:", owner);

  // Test wallet approval
  console.log("\n👥 Testing Wallet Approval:");
  const isApprovedBefore = await token.isApproved(addr1);
  console.log("   Addr1 approved before:", isApprovedBefore);

  if (!isApprovedBefore) {
    console.log("   Approving addr1...");
    const approveTx = await token.approveWallet(addr1);
    await approveTx.wait();
    console.log("   ✅ Approved!");
  }

  const isApprovedAfter = await token.isApproved(addr1);
  console.log("   Addr1 approved after:", isApprovedAfter);

  // Approve addr2
  console.log("\n   Approving addr2...");
  const approve2Tx = await token.approveWallet(addr2);
  await approve2Tx.wait();
  console.log("   ✅ Addr2 approved!");

  // Test minting
  console.log("\n💰 Testing Minting:");
  const mintAmount = ethers.parseEther("10000");
  console.log("   Minting 10,000 tokens to addr1...");

  const mintTx = await token.mint(addr1, mintAmount);
  const mintReceipt = await mintTx.wait();
  console.log("   ✅ Minted! Gas used:", mintReceipt.gasUsed.toString());

  const balance1 = await token.balanceOf(addr1);
  console.log("   Addr1 balance:", ethers.formatEther(balance1), symbol);

  // Test transfer
  console.log("\n🔄 Testing Transfer:");
  const transferAmount = ethers.parseEther("100");
  console.log("   Transferring 100 tokens from addr1 to addr2...");

  const tokenAsAddr1 = token.connect(addr1Signer);
  const transferTx = await tokenAsAddr1.transfer(addr2, transferAmount);
  await transferTx.wait();
  console.log("   ✅ Transferred!");

  const balance2 = await token.balanceOf(addr2);
  console.log("   Addr2 balance:", ethers.formatEther(balance2), symbol);

  // Test stock split
  console.log("\n📈 Testing Stock Split (7-for-1):");
  const balanceBeforeSplit = await token.balanceOf(addr1);
  console.log("   Addr1 balance before:", ethers.formatEther(balanceBeforeSplit), symbol);

  const splitTx = await token.executeSplit(7);
  await splitTx.wait();
  console.log("   ✅ Split executed!");

  const balanceAfterSplit = await token.balanceOf(addr1);
  console.log("   Addr1 balance after:", ethers.formatEther(balanceAfterSplit), symbol);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ All Tests Passed!");
  console.log("=".repeat(60));
  console.log("\n💡 Test the IssuerService:");
  console.log(`   cd backend`);
  console.log(`   npm run test-issuer -- ${contractAddress} 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
