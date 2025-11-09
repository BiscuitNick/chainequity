/**
 * Create Test Data Script
 */

import hre from 'hardhat';

async function main() {
  console.log('\n🧪 Creating test data on deployed contract\n');

  const [owner, alice, bob] = await hre.ethers.getSigners();
  const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS!;
  
  console.log('Contract:', contractAddress);
  console.log('Owner:', owner.address);
  console.log('Alice:', alice.address);
  console.log('Bob:', bob.address);

  const token = await hre.ethers.getContractAt('ChainEquityToken', contractAddress);

  // Approve wallets
  console.log('\n1️⃣  Approving wallets...');
  let tx = await token.connect(owner).approveWallet(alice.address);
  await tx.wait();
  console.log('   ✅ Alice approved');

  tx = await token.connect(owner).approveWallet(bob.address);
  await tx.wait();
  console.log('   ✅ Bob approved');

  // Mint tokens
  console.log('\n2️⃣  Minting tokens...');
  tx = await token.connect(owner).mint(alice.address, hre.ethers.parseEther('1000'));
  await tx.wait();
  console.log('   ✅ Minted 1000 tokens to Alice');

  tx = await token.connect(owner).mint(bob.address, hre.ethers.parseEther('500'));
  await tx.wait();
  console.log('   ✅ Minted 500 tokens to Bob');

  // Transfers
  console.log('\n3️⃣  Executing transfers...');
  tx = await token.connect(alice).transfer(bob.address, hre.ethers.parseEther('100'));
  await tx.wait();
  console.log('   ✅ Alice → Bob: 100 tokens');

  tx = await token.connect(bob).transfer(alice.address, hre.ethers.parseEther('50'));
  await tx.wait();
  console.log('   ✅ Bob → Alice: 50 tokens');

  // Stock split
  console.log('\n4️⃣  Executing 2-for-1 split...');
  tx = await token.connect(owner).executeStockSplit(20000);
  await tx.wait();
  console.log('   ✅ Split executed');

  // Post-split transfer
  console.log('\n5️⃣  Post-split transfer...');
  tx = await token.connect(alice).transfer(bob.address, hre.ethers.parseEther('200'));
  await tx.wait();
  console.log('   ✅ Alice → Bob: 200 tokens');

  console.log('\n✅ Test data created!\n');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
