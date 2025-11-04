import hre from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
  console.log("\n🚀 Deploying ChainEquityToken to Local Network\n");

  // Get accounts
  const [owner, addr1, addr2] = await hre.viem.getWalletClients();

  console.log("Deploying with account:", owner.account.address);

  // Deploy
  const token = await hre.viem.deployContract("ChainEquityToken", [
    "ChainEquity",
    "CEQ",
    owner.account.address,
  ]);

  console.log("\n✅ ChainEquityToken deployed to:", token.address);

  // Test basic functionality
  console.log("\n📋 Testing Contract:");
  console.log("   Name:", await token.read.name());
  console.log("   Symbol:", await token.read.symbol());
  console.log("   Owner:", await token.read.owner());

  // Approve a wallet
  console.log("\n👥 Approving test wallet...");
  await token.write.approveWallet([addr1.account.address]);
  console.log("   ✅ Approved:", addr1.account.address);

  // Mint tokens
  console.log("\n💰 Minting tokens...");
  await token.write.mint([addr1.account.address, parseEther("10000")]);
  const balance = await token.read.balanceOf([addr1.account.address]);
  console.log("   ✅ Minted:", formatEther(balance), "CEQ");

  // Test transfer
  console.log("\n🔄 Testing transfer...");
  await token.write.approveWallet([addr2.account.address]);

  const tokenAsAddr1 = await hre.viem.getContractAt(
    "ChainEquityToken",
    token.address,
    { client: { wallet: addr1 } }
  );

  await tokenAsAddr1.write.transfer([addr2.account.address, parseEther("100")]);
  const balance2 = await token.read.balanceOf([addr2.account.address]);
  console.log("   ✅ Transferred 100 CEQ");
  console.log("   Addr2 balance:", formatEther(balance2), "CEQ");

  // Test stock split
  console.log("\n📈 Testing stock split...");
  await token.write.executeSplit([7n]);
  const balanceAfterSplit = await token.read.balanceOf([addr1.account.address]);
  console.log("   ✅ 7-for-1 split executed");
  console.log("   New balance:", formatEther(balanceAfterSplit), "CEQ");

  console.log("\n" + "=".repeat(50));
  console.log("✅ All local tests passed!");
  console.log("=".repeat(50));
  console.log("\nContract Address:", token.address);
  console.log("Owner Address:", owner.account.address);
  console.log("\n💡 To interact further:");
  console.log("   npx hardhat console --network localhost");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
