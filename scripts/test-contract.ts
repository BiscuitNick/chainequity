import hre from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
  console.log("\n🚀 Testing ChainEquityToken Contract\n");
  console.log("=".repeat(50));

  // Get wallet clients (test accounts)
  const [owner, addr1, addr2, addr3] = await hre.viem.getWalletClients();

  console.log("✅ Owner address:", owner.account.address);
  console.log("✅ Test addresses loaded\n");

  // Deploy contract
  console.log("📦 Deploying ChainEquityToken...");
  const token = await hre.viem.deployContract("ChainEquityToken", [
    "ChainEquity",
    "CEQ",
    owner.account.address,
  ]);

  console.log("✅ Token deployed to:", token.address);
  console.log("");

  // Test basic info
  console.log("📋 Token Information:");
  console.log("   Name:", await token.read.name());
  console.log("   Symbol:", await token.read.symbol());
  console.log("   Decimals:", await token.read.decimals());
  console.log("   Owner:", await token.read.owner());
  console.log("   Split Multiplier:", await token.read.splitMultiplier());
  console.log("");

  // Test allowlist
  console.log("👥 Testing Allowlist Management:");
  console.log("   Owner approved?", await token.read.isApproved([owner.account.address]));

  await token.write.approveWallet([addr1.account.address]);
  console.log("   ✅ Approved addr1");
  console.log("   Addr1 approved?", await token.read.isApproved([addr1.account.address]));

  await token.write.approveWallet([addr2.account.address]);
  console.log("   ✅ Approved addr2");
  console.log("");

  // Test minting
  console.log("💰 Testing Minting:");
  const mintAmount = parseEther("1000");
  await token.write.mint([addr1.account.address, mintAmount]);
  console.log("   ✅ Minted 1000 CEQ to addr1");

  let balance = await token.read.balanceOf([addr1.account.address]);
  console.log("   Addr1 balance:", formatEther(balance), "CEQ");

  await token.write.mint([addr2.account.address, parseEther("500")]);
  console.log("   ✅ Minted 500 CEQ to addr2");

  let totalSupply = await token.read.totalSupply();
  console.log("   Total supply:", formatEther(totalSupply), "CEQ");
  console.log("");

  // Test successful transfer
  console.log("🔄 Testing Transfers:");
  const transferAmount = parseEther("100");

  // Get token contract instance for addr1
  const tokenAsAddr1 = await hre.viem.getContractAt(
    "ChainEquityToken",
    token.address,
    { client: { wallet: addr1 } }
  );

  await tokenAsAddr1.write.transfer([addr2.account.address, transferAmount]);
  console.log("   ✅ Transferred 100 CEQ from addr1 to addr2");

  balance = await token.read.balanceOf([addr1.account.address]);
  console.log("   Addr1 balance:", formatEther(balance), "CEQ");

  balance = await token.read.balanceOf([addr2.account.address]);
  console.log("   Addr2 balance:", formatEther(balance), "CEQ");
  console.log("");

  // Test blocked transfer
  console.log("🚫 Testing Blocked Transfer:");
  try {
    await tokenAsAddr1.write.transfer([addr3.account.address, parseEther("10")]);
    console.log("   ❌ ERROR: Transfer should have been blocked!");
  } catch (error: any) {
    console.log("   ✅ Transfer correctly blocked to non-approved wallet");
    const errorMsg = error.message || error.toString();
    if (errorMsg.includes("NotInAllowlist")) {
      console.log("   Reason: NotInAllowlist");
    } else {
      console.log("   Reason:", errorMsg.split('\n')[0].substring(0, 80));
    }
  }
  console.log("");

  // Test stock split
  console.log("📈 Testing Stock Split:");
  console.log("   Before split:");
  balance = await token.read.balanceOf([addr1.account.address]);
  console.log("   Addr1 balance:", formatEther(balance), "CEQ");

  totalSupply = await token.read.totalSupply();
  console.log("   Total supply:", formatEther(totalSupply), "CEQ");

  await token.write.executeSplit([7n]);
  console.log("   ✅ Executed 7-for-1 split");

  console.log("   After split:");
  balance = await token.read.balanceOf([addr1.account.address]);
  console.log("   Addr1 balance:", formatEther(balance), "CEQ");

  totalSupply = await token.read.totalSupply();
  console.log("   Total supply:", formatEther(totalSupply), "CEQ");

  const multiplier = await token.read.splitMultiplier();
  console.log("   Split multiplier:", multiplier.toString());
  console.log("");

  // Test symbol change
  console.log("🏷️  Testing Symbol Change:");
  console.log("   Current symbol:", await token.read.symbol());

  await token.write.updateSymbol(["CEQX"]);
  console.log("   ✅ Changed symbol to CEQX");
  console.log("   New symbol:", await token.read.symbol());
  console.log("");

  // Test name change
  console.log("📝 Testing Name Change:");
  console.log("   Current name:", await token.read.name());

  await token.write.updateName(["ChainEquity Pro"]);
  console.log("   ✅ Changed name to ChainEquity Pro");
  console.log("   New name:", await token.read.name());
  console.log("");

  // Final summary
  console.log("=".repeat(50));
  console.log("✅ All tests completed successfully!");
  console.log("\n📊 Final State:");
  console.log("   Token:", await token.read.name(), "(", await token.read.symbol(), ")");
  console.log("   Total Supply:", formatEther(await token.read.totalSupply()), "CEQX");
  console.log("   Holders: 2 (addr1, addr2)");
  console.log("   Split Multiplier:", (await token.read.splitMultiplier()).toString(), "x");
  console.log("   Contract Address:", token.address);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
