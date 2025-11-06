import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ABI = [
  "function approveWallet(address wallet) external",
  "function mint(address to, uint256 amount) external",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function executeStockSplit(uint256 newMultiplierBP) external"
];

async function main() {
  console.log('\n🧪 Creating test data\n');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const owner = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  const alice = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);
  const bob = new ethers.Wallet('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', provider);

  const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS!;
  const token = new ethers.Contract(contractAddress, CONTRACT_ABI, owner);

  console.log('Contract:', contractAddress);

  console.log('1️⃣  Approving wallets...');
  await (await token.approveWallet(alice.address)).wait();
  await (await token.approveWallet(bob.address)).wait();

  console.log('2️⃣  Minting tokens...');
  await (await token.mint(alice.address, ethers.parseEther('1000'))).wait();
  await (await token.mint(bob.address, ethers.parseEther('500'))).wait();

  console.log('3️⃣  Executing transfers...');
  await (await token.connect(alice).transfer(bob.address, ethers.parseEther('100'))).wait();
  await (await token.connect(bob).transfer(alice.address, ethers.parseEther('50'))).wait();

  console.log('4️⃣  Executing 2-for-1 split...');
  await (await token.executeStockSplit(20000)).wait();

  console.log('5️⃣  Post-split transfer...');
  await (await token.connect(alice).transfer(bob.address, ethers.parseEther('200'))).wait();

  console.log('\n✅ Done!\n');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
