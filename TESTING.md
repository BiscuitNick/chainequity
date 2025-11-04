# ChainEquity Testing Guide

This guide explains how to test everything built so far in the ChainEquity project.

## Prerequisites

- Node.js installed
- Dependencies installed: `npm install` (in root) and `cd backend && npm install`
- No API keys required for local testing

## 🧪 Quick Test (Recommended)

Test the complete system in 3 terminals:

### Terminal 1: Start Local Blockchain

```bash
npx hardhat node
```

Keep this running. You'll see 20 test accounts with private keys.

### Terminal 2: Deploy Contract

**Step 1 - Deploy:**
```bash
npx hardhat ignition deploy ignition/modules/ChainEquityDeploy.ts --network localhost
```

This will deploy ChainEquityToken. Look for output like:
```
ChainEquityToken#ChainEquityToken - 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Copy the contract address (0x5FbDB...)!**

**Step 2 - Test the contract:**
```bash
npx hardhat run scripts/test-deployment.ts --network localhost -- <CONTRACT_ADDRESS>
```

Replace `<CONTRACT_ADDRESS>` with the address from Step 1.

This will:
- Test basic functionality (minting, transfers, splits)
- Display the exact command for Terminal 3

### Terminal 3: Test IssuerService

```bash
cd backend
npm run test-issuer -- <CONTRACT_ADDRESS> <PRIVATE_KEY>
```

Replace:
- `<CONTRACT_ADDRESS>` - From Terminal 2 output
- `<PRIVATE_KEY>` - Use Account #0 private key from Terminal 1

**Example:**
```bash
npm run test-issuer -- 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This comprehensive test will:
1. ✅ Get token info (name, symbol, decimals)
2. ✅ Get total supply
3. ✅ Check wallet approval status
4. ✅ Approve a wallet
5. ✅ Mint tokens
6. ✅ Execute stock split
7. ✅ Update token symbol
8. ✅ List all approved wallets
9. ✅ Test retry/error handling

---

## 📋 What's Being Tested

### 1. Smart Contract (ChainEquityToken.sol)

**Features tested in deploy-local.ts:**
- ✅ Deployment with initial parameters
- ✅ Wallet approval/revocation (allowlist)
- ✅ Token minting (owner-only)
- ✅ Transfer restrictions (approved addresses only)
- ✅ Virtual stock splits (7-for-1)
- ✅ Balance calculations with split multiplier

**Location:** `contracts/ChainEquityToken.sol`

### 2. Backend IssuerService

**Features tested in test-issuer.ts:**
- ✅ Service initialization with ethers.js
- ✅ Wallet management (approve/revoke/check)
- ✅ Token operations (mint/balance/supply)
- ✅ Corporate actions (splits/symbol changes)
- ✅ Transaction management with retry logic
- ✅ Gas estimation
- ✅ Error handling

**Location:** `backend/src/services/issuer.service.ts`

### 3. Configuration & Infrastructure

**Components:**
- ✅ Hardhat 3.0 setup with Viem
- ✅ TypeScript compilation (backend)
- ✅ Environment configuration
- ✅ Alchemy SDK setup
- ✅ Database schema (SQLite)
- ✅ Express server foundation

---

## 🔍 Detailed Testing Steps

### Test 1: Smart Contract Only

Just test the Solidity contract without the backend:

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy-local.ts --network localhost
```

**Expected Output:**
```
🚀 Deploying ChainEquityToken to Local Network

Deploying with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

✅ ChainEquityToken deployed to: 0x5FbDB...

📋 Testing Contract:
   Name: ChainEquity
   Symbol: CEQ
   Owner: 0xf39Fd...

👥 Approving test wallet...
   ✅ Approved: 0x70997...

💰 Minting tokens...
   ✅ Minted: 10000 CEQ

🔄 Testing transfer...
   ✅ Transferred 100 CEQ
   Addr2 balance: 100 CEQ

📈 Testing stock split...
   ✅ 7-for-1 split executed
   New balance: 69300 CEQ

✅ All local tests passed!
```

### Test 2: Backend IssuerService

Test the backend service layer:

```bash
# Prerequisites: Terminals 1 & 2 from above

# Terminal 3
cd backend
npm run test-issuer -- 0x5FbDB2315678afecb367f032d93F642f64180aa3 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Expected Output:**
```
🧪 Testing IssuerService
============================================================

✅ IssuerService Initialized
   Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   Signer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

📋 Test 1: Get Token Info
------------------------------------------------------------
   Name: ChainEquity
   Symbol: CEQ
   Decimals: 18

💰 Test 2: Get Total Supply
------------------------------------------------------------
   Total Supply: 10000.0 CEQ

👤 Test 3: Check Wallet Approval
------------------------------------------------------------
   Testing address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Is Approved: false

✅ Test 4: Approve Wallet
------------------------------------------------------------
   Transaction Hash: 0x...
   Block Number: 2
   Gas Used: 47234
   Status: Success
   Verified Approved: true

💸 Test 5: Mint Tokens
------------------------------------------------------------
   Balance Before: 0.0 CEQ
   Minted: 1000 CEQ
   Transaction Hash: 0x...
   Gas Used: 51890
   Balance After: 1000.0 CEQ

📊 Test 6: Get Split Multiplier
------------------------------------------------------------
   Current Multiplier: 1

📈 Test 7: Execute Stock Split (2-for-1)
------------------------------------------------------------
   Balance Before Split: 1000.0 CEQ
   Split Executed: 2-for-1
   Transaction Hash: 0x...
   Gas Used: 34567
   Balance After Split: 2000.0 CEQ
   New Multiplier: 2

🏷️  Test 8: Update Symbol
------------------------------------------------------------
   Old Symbol: CEQ
   Symbol Updated to: CEQX
   Transaction Hash: 0x...
   Verified Symbol: CEQX

📝 Test 9: Get All Approved Wallets
------------------------------------------------------------
   Total Approved: 3
   1. 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
   2. 0x70997970c51812dc3a010c7d01b50e0d17dc79c8
   3. 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc

============================================================
✅ All Tests Passed!
============================================================

📊 Final State:
   Symbol: CEQX
   Split Multiplier: 2
   Total Supply: 22000.0 CEQX
   Test Address Balance: 2000.0 CEQX
   Approved Wallets: 3
```

### Test 3: Express Server

Test the backend server (without event listener for now):

```bash
cd backend
npm run dev
```

**Test the health endpoint:**
```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T..."
}
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Solution:**
```bash
cd backend
npm install
```

### Error: "Invalid contract address"

**Solution:** Make sure you're using the contract address from the deployment output (Terminal 2).

### Error: "Connection refused"

**Solution:** Make sure Terminal 1 (Hardhat node) is still running.

### Error: "Nonce too high"

**Solution:** Restart the Hardhat node and redeploy:
```bash
# Terminal 1: Ctrl+C, then
npx hardhat node

# Terminal 2: Redeploy
npx hardhat run scripts/deploy-local.ts --network localhost
```

### Error: "Transaction reverted"

This is expected for some test cases (like transferring to non-approved addresses). The error handling is being tested.

---

## 📊 Test Coverage

### ✅ Completed (Tasks 1-4)

| Component | Status | Tests |
|-----------|--------|-------|
| Hardhat Setup | ✅ | Compilation, network config |
| ChainEquityToken Contract | ✅ | All functions, events |
| Backend Foundation | ✅ | Server, DB schema, config |
| IssuerService | ✅ | All 9 operations |

### ⏳ Not Yet Tested (Tasks 5-12)

| Component | Status | Notes |
|-----------|--------|-------|
| Event Indexer | ❌ | Task 5 - not built yet |
| Cap-Table Service | ❌ | Task 6 - not built yet |
| CLI Tool | ❌ | Task 7 - not built yet |
| Deployment Scripts | ❌ | Task 8 - not built yet |
| REST API | ❌ | Task 9 - not built yet |
| Frontend | ❌ | Task 11 - optional |

---

## 🎯 Next Steps

After testing the current implementation:

1. **Task 5:** Build Event Indexer (real-time blockchain monitoring)
2. **Task 6:** Create Cap-Table Service (ownership analytics)
3. **Task 7:** Develop CLI Tool (command-line interface)
4. **Task 8:** Deployment Scripts (testnet deployment)
5. **Task 9:** REST API Endpoints
6. **Task 10:** Comprehensive Testing & Documentation

---

## 💡 Quick Commands Reference

```bash
# Start local blockchain
npx hardhat node

# Deploy contract locally
npx hardhat run scripts/deploy-local.ts --network localhost

# Test IssuerService
cd backend && npm run test-issuer -- <address> <key>

# Start backend server
cd backend && npm run dev

# Compile contracts
npx hardhat compile

# Run backend build
cd backend && npm run build
```

---

**Last Updated:** November 3, 2025
