# ChainEquity Testnet Deployment Guide

This guide covers deploying and running ChainEquity on Polygon Amoy testnet.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Get Testnet MATIC](#get-testnet-matic)
3. [Configure Environment](#configure-environment)
4. [Deploy Contract](#deploy-contract)
5. [Verify Contract](#verify-contract)
6. [Sync Historical Events](#sync-historical-events)
7. [Run Application](#run-application)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- MetaMask wallet installed
- Polygon Amoy network added to MetaMask
- PolygonScan API key (free from https://polygonscan.com/apis)
- Alchemy API key (free from https://alchemy.com)

### Add Polygon Amoy to MetaMask

1. Open MetaMask
2. Click network dropdown (top left)
3. Click "Add Network"
4. Enter these details:
   - **Network Name**: Polygon Amoy
   - **RPC URL**: `https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY`
   - **Chain ID**: `80002`
   - **Currency Symbol**: `POL`
   - **Block Explorer**: `https://amoy.polygonscan.com`

---

## Get Testnet MATIC

You need testnet MATIC (POL) to pay for gas fees. Try multiple faucets:

### Primary Faucets

1. **Polygon Faucet** (0.1 POL per request)
   - URL: https://faucet.polygon.technology/
   - Select "Polygon Amoy"
   - Enter your wallet address
   - Complete CAPTCHA

2. **Alchemy Faucet** (0.5 POL per day)
   - URL: https://www.alchemy.com/faucets/polygon-amoy
   - Sign in with Alchemy account
   - Enter your wallet address

3. **QuickNode Faucet**
   - URL: https://faucet.quicknode.com/polygon/amoy
   - Complete verification

### Tips for Getting More Testnet MATIC

- Use multiple faucets (each has different limits)
- Wait 24 hours between requests on the same faucet
- Create multiple Alchemy accounts if needed
- Join Polygon Discord and request from community

**⚠️ WARNING**: Testnet faucets are rate-limited and may only give small amounts. Budget your transactions carefully during testing.

---

## Configure Environment

### 1. Root `.env` File

Update `/Users/nickkenkel/code/gauntlet/chainequity/.env`:

```bash
# Alchemy API Key
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Your wallet private key (NEVER commit to git!)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# PolygonScan API Key (for verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# Contract address (update after deployment)
TOKEN_CONTRACT_ADDRESS=0xYourContractAddressHere
```

**Get Your Private Key from MetaMask:**
1. Open MetaMask
2. Click the 3 dots menu
3. Account Details → Show Private Key
4. Enter password and copy

**⚠️ SECURITY WARNING**: Never commit your private key to git or share it publicly!

### 2. Backend `.env` File

Update `/Users/nickkenkel/code/gauntlet/chainequity/backend/.env`:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Network Configuration
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_NETWORK=polygon-amoy

# Comment out local network
# USE_LOCAL_NETWORK=true
LOCAL_RPC_URL=http://127.0.0.1:8545

# Contract address (update after deployment)
TOKEN_CONTRACT_ADDRESS=0xYourContractAddressHere

# Issuer Private Key (same as deployer for testing)
ISSUER_PRIVATE_KEY=your_private_key_here

# Database
DATABASE_PATH=./data/chainequity.db

# Deployment block (update after deployment)
DEPLOYMENT_BLOCK=0
```

### 3. Frontend `.env.local` File

Update `/Users/nickkenkel/code/gauntlet/chainequity/frontend/.env.local`:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Alchemy API key
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# WalletConnect Project ID (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Polygon Amoy Testnet (ACTIVE)
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddressHere
TOKEN_CONTRACT_ADDRESS=0xYourContractAddressHere

# Local Hardhat Network (COMMENTED OUT)
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
# TOKEN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

## Deploy Contract

### 1. Update Constructor Arguments

Edit `/Users/nickkenkel/code/gauntlet/chainequity/backend/constructor-args.js`:

```javascript
module.exports = [
  "ChainEquity",           // Token name
  "CEQ",                   // Token symbol
  "0xYourWalletAddress"    // Issuer address (your wallet)
];
```

### 2. Deploy to Polygon Amoy

From the root directory:

```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

**Expected Output:**
```
Deploying ChainEquityToken...
Contract deployed to: 0xYourNewContractAddress
Issuer address: 0xYourWalletAddress
```

### 3. Update Contract Addresses

Copy the deployed contract address and update:

1. Root `.env`: `TOKEN_CONTRACT_ADDRESS=0xYourNewContractAddress`
2. Backend `.env`: `TOKEN_CONTRACT_ADDRESS=0xYourNewContractAddress`
3. Frontend `.env.local`:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourNewContractAddress`
   - `TOKEN_CONTRACT_ADDRESS=0xYourNewContractAddress`

---

## Verify Contract

### 1. Flatten Contract (if needed)

```bash
cd backend
npx hardhat flatten contracts/ChainEquityToken.sol > ChainEquityToken-flattened.sol
```

### 2. Verify on PolygonScan

```bash
npx hardhat verify --network polygonAmoy \
  --constructor-args constructor-args.js \
  0xYourContractAddress
```

**If verification fails**, manually verify:

1. Go to https://amoy.polygonscan.com/address/0xYourContractAddress#code
2. Click "Verify and Publish"
3. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.28+commit.7893614a
   - License: MIT
4. Paste flattened source code
5. Constructor Arguments: Get from PolygonScan transaction details
6. Optimization: Yes (200 runs)
7. EVM Version: shanghai

### 3. Get Deployment Block Number

1. Visit https://amoy.polygonscan.com/address/0xYourContractAddress
2. Find the contract creation transaction
3. Note the block number
4. Update backend `.env`: `DEPLOYMENT_BLOCK=YourBlockNumber`

---

## Sync Historical Events

Before running the app, sync all blockchain events to your local database:

```bash
cd backend
npm run sync-testnet
```

This will:
- Connect to Polygon Amoy
- Fetch all events from deployment block to current block
- Index events in local SQLite database
- Update balances

**Expected Output:**
```
🔄 ChainEquity Testnet Historical Event Sync
Current block: XXXXX
Starting sync from block: XXXXX
Blocks to process: XXX

💰 Mint: 1000.0 tokens
   From: 0x0000000000000000000000000000000000000000
   To: 0xYourWalletAddress
   Block: XXXXX

✅ Historical event sync completed successfully!
```

---

## Run Application

### 1. Start Backend (Terminal 1)

```bash
cd backend
npm start
```

### 2. Start Event Indexer (Terminal 2)

```bash
cd backend
npm run dev:indexer
```

### 3. Start Frontend (Terminal 3)

```bash
cd frontend
npm run dev
```

### 4. Access Application

Open browser to: http://localhost:3050

### 5. Connect MetaMask

1. Click "Connect Wallet"
2. Select MetaMask
3. Approve connection
4. **Ensure you're on Polygon Amoy network**

---

## Troubleshooting

### Transaction Failing: "Insufficient Funds"

**Problem**: Not enough testnet MATIC for gas fees

**Solution**:
- Get more from faucets (see [Get Testnet MATIC](#get-testnet-matic))
- Wait 24 hours and try faucets again
- Check balance: https://amoy.polygonscan.com/address/YourAddress

### UI Not Showing Events

**Problem**: Database is empty or out of sync

**Solution**:
```bash
cd backend

# Clear database
rm -rf data/chainequity.db*

# Re-sync events
npm run sync-testnet
```

### Backend Can't Connect

**Problem**: Wrong Alchemy API key or network

**Solution**:
- Verify `ALCHEMY_API_KEY` in `.env`
- Check `ALCHEMY_NETWORK=polygon-amoy`
- Ensure `USE_LOCAL_NETWORK` is commented out

### Contract Verification Failed

**Problem**: Compiler settings mismatch

**Solution**:
1. Check `hardhat.config.ts` solidity version matches contract
2. Ensure optimization settings match: `enabled: true, runs: 200`
3. Use correct EVM version: `shanghai`
4. Try manual verification on PolygonScan

### MetaMask Wrong Network

**Problem**: Transactions failing because wallet is on wrong network

**Solution**:
1. Open MetaMask
2. Switch to "Polygon Amoy" network
3. If not listed, add it manually (see [Prerequisites](#prerequisites))

### Events Not Indexing Real-Time

**Problem**: Event indexer not running

**Solution**:
```bash
# Check if indexer is running
lsof -i:4000

# Restart indexer
cd backend
npm run dev:indexer
```

---

## Architecture Notes

### Event Indexing Flow

1. **Historical Sync** (one-time)
   - `npm run sync-testnet` fetches all past events
   - Stores in SQLite database
   - Updates balances

2. **Real-Time Indexing** (continuous)
   - `npm run dev:indexer` listens via WebSocket
   - Captures new events as they happen
   - Updates database automatically

### Database Structure

Located at: `backend/data/chainequity.db`

Tables:
- `events` - All blockchain events
- `balances` - Current token balances
- `corporate_actions` - Stock splits, symbol changes
- `metadata` - Sync state and config

To view database:
```bash
cd backend
sqlite3 data/chainequity.db
.tables
SELECT * FROM events;
```

---

## Switching Back to Local Development

See `README.md` for instructions on running with local Hardhat node.

Quick steps:
1. Uncomment `USE_LOCAL_NETWORK=true` in backend `.env`
2. Update contract addresses to local: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
3. Start Hardhat node: `npx hardhat node`
4. Deploy locally: `npx hardhat run scripts/deploy.ts --network localhost`

---

## Current Testnet Deployment

**Network**: Polygon Amoy
**Chain ID**: 80002
**Contract Address**: `0x31b812f5c2232336Af43FC3499483ef7532a813d`
**Deployment Block**: `28835126`
**Block Explorer**: https://amoy.polygonscan.com/address/0x31b812f5c2232336Af43FC3499483ef7532a813d

**Verified**: ✅ Yes
**Initial Supply**: 1000 CEQ

---

## Useful Links

- **Polygon Amoy Explorer**: https://amoy.polygonscan.com/
- **Polygon Docs**: https://docs.polygon.technology/
- **Alchemy Dashboard**: https://dashboard.alchemy.com/
- **Hardhat Docs**: https://hardhat.org/docs
- **Ethers.js Docs**: https://docs.ethers.org/v6/

---

**Last Updated**: 2025-11-09
