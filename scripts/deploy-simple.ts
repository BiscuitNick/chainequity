/**
 * Simple deployment script for local testing
 * Works with: npx hardhat run scripts/deploy-simple.ts --network localhost
 */

import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("\n🚀 Deploying ChainEquityToken to Local Network\n");

  try {
    // Get public client (read operations)
    const publicClient = await hre.viem.getPublicClient();

    // Get wallet clients (write operations)
    const [deployer, addr1, addr2] = await hre.viem.getWalletClients();

    console.log("Deploying with account:", deployer.account.address);
    console.log("Chain ID:", await publicClient.getChainId());

    // Deploy contract
    console.log("\n📝 Deploying contract...");
    const token = await hre.viem.deployContract("ChainEquityToken", [
      "ChainEquity",
      "CEQ",
      deployer.account.address,
    ]);

    console.log("\n✅ ChainEquityToken deployed to:", token.address);

    // Test basic functionality
    console.log("\n📋 Testing Contract:");
    const name = await token.read.name();
    const symbol = await token.read.symbol();
    const owner = await token.read.owner();

    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Owner:", owner);

    // Approve wallets
    console.log("\n👥 Approving test wallets...");
    await token.write.approveWallet([addr1.account.address]);
    console.log("   ✅ Approved:", addr1.account.address);

    await token.write.approveWallet([addr2.account.address]);
    console.log("   ✅ Approved:", addr2.account.address);

    // Mint tokens
    console.log("\n💰 Minting tokens...");
    const mintAmount = parseEther("10000");
    await token.write.mint([addr1.account.address, mintAmount]);

    const balance = await token.read.balanceOf([addr1.account.address]);
    console.log("   ✅ Minted:", formatEther(balance), "CEQ to", addr1.account.address);

    // Test transfer
    console.log("\n🔄 Testing transfer...");
    const tokenAsAddr1 = await hre.viem.getContractAt(
      "ChainEquityToken",
      token.address,
      { client: { wallet: addr1 } }
    );

    const transferAmount = parseEther("100");
    await tokenAsAddr1.write.transfer([addr2.account.address, transferAmount]);

    const balance2 = await token.read.balanceOf([addr2.account.address]);
    console.log("   ✅ Transferred:", formatEther(transferAmount), "CEQ");
    console.log("   Addr2 balance:", formatEther(balance2), "CEQ");

    // Test stock split
    console.log("\n📈 Testing stock split (7-for-1)...");
    await token.write.executeSplit([7n]);

    const balanceAfterSplit = await token.read.balanceOf([addr1.account.address]);
    console.log("   ✅ Split executed");
    console.log("   New balance:", formatEther(balanceAfterSplit), "CEQ");

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ All local tests passed!");
    console.log("=".repeat(60));
    console.log("\n📊 Contract Details:");
    console.log("   Contract Address:", token.address);
    console.log("   Owner Address:", deployer.account.address);
    console.log("   Network: localhost (Hardhat)");
    console.log("\n💡 Use this for IssuerService test:");
    console.log(`   cd backend`);
    console.log(`   npm run test-issuer -- ${token.address} 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
    console.log("");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
