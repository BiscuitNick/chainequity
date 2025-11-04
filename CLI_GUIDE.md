# ChainEquity CLI Guide

Complete guide for setting up the local blockchain and using all CLI commands.

---

## Quick Start

**Already set up? Jump straight to common tasks:**

```bash
# Fresh start (reset everything and repopulate with test data)
./reset-and-populate.sh

# Database only reset (when blockchain is fine but DB is out of sync)
./reset-db-only.sh

# View current state
npm run cli captable
npm run cli corporate history
npm run cli token info

# Issue shares to new wallet
npm run cli wallet approve 0x<address>
npm run cli token mint 0x<address> <amount>

# Execute stock split
npm run cli corporate split <multiplier>  # e.g., 2 (forward), 0.5 (reverse)
```

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Fresh Start Guide](#fresh-start-guide)
4. [Starting the Local Blockchain](#starting-the-local-blockchain)
5. [Deployment](#deployment)
6. [CLI Commands Reference](#cli-commands-reference)
7. [Testing Workflows](#testing-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Terminal access

## Initial Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` file in the project root:

```bash
# Root .env
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
TOKEN_CONTRACT_ADDRESS=  # Will be set after deployment
```

The `DEPLOYER_PRIVATE_KEY` shown above is Hardhat's default test account #0 (safe for local development).

Create `backend/.env`:

```bash
# Backend .env
TOKEN_CONTRACT_ADDRESS=  # Will be set after deployment
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ISSUER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://127.0.0.1:8545
```

---

## Fresh Start Guide

**Use this section when you want to reset everything and start with a clean blockchain.**

This is useful when:
- You want to test from scratch
- The blockchain state is corrupted
- You need to clear all data and repopulate
- Contract addresses have changed

### Step-by-Step Fresh Start

#### 1. Stop Hardhat Node

If the Hardhat node is running, stop it:
```bash
# Press Ctrl+C in the terminal running the node
```

#### 2. Clean Database and Environment

```bash
# Remove database
rm -rf backend/data

# Optional: Clear contract artifacts and cache (if recompiling)
rm -rf artifacts cache

# Optional: Remove old .env if you want to start completely fresh
# rm .env backend/.env
```

#### 3. Start Fresh Hardhat Node

```bash
npx hardhat node
```

**Important:** Leave this terminal open. The node must keep running.

#### 4. Deploy Fresh Contract

In a new terminal:

```bash
npx hardhat run scripts/deploy-production.ts --network localhost
```

This will:
- Compile the contract (if needed)
- Deploy to the fresh blockchain
- Save new contract address to `.env`

#### 5. Update Backend Environment

```bash
cp .env backend/.env
```

#### 6. Build Backend (if needed)

```bash
cd backend
npm run build
cd ..
```

---

### Quick Repopulation Workflow

After resetting, use this workflow to quickly set up test data.

#### Standard Test Setup (3 Wallets)

```bash
# Wallet addresses for testing
WALLET_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
WALLET_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
WALLET_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906

# 1. Approve wallets
npm run cli wallet approve $WALLET_1
npm run cli wallet approve $WALLET_2
npm run cli wallet approve $WALLET_3

# 2. Mint tokens
npm run cli token mint $WALLET_1 1000
npm run cli token mint $WALLET_2 500
npm run cli token mint $WALLET_3 250

# 3. Verify minting
npm run cli token info
npm run cli token balance $WALLET_1
npm run cli token balance $WALLET_2
npm run cli token balance $WALLET_3

# 4. Run indexer to populate database
cd backend && npm run test-indexer-local && cd ..

# 5. View cap table
npm run cli captable
```

#### Test Setup with Stock Splits

```bash
# Use standard setup first, then add splits:

# Execute various splits
npm run cli corporate split 2       # 2-for-1 split
npm run cli corporate split 1.5     # 1.5-for-1 split
npm run cli corporate split 0.5     # 1-for-2 reverse split

# Update database
cd backend && npm run test-indexer-local && cd ..

# View results
npm run cli captable
npm run cli corporate history
```

#### Test Setup with Corporate Actions

```bash
# Use standard setup first, then:

# 1. Execute stock split
npm run cli corporate split 1.11

# 2. Change symbol
npm run cli corporate symbol CEQT

# 3. Change name
npm run cli corporate name "ChainEquity Token V2"

# 4. Update database and view
cd backend && npm run test-indexer-local && cd ..
npm run cli corporate history
npm run cli token info
```

---

### One-Command Reset Scripts

Two automated scripts are provided for common reset scenarios:

#### Full Reset and Repopulate (`reset-and-populate.sh`)

**Use when:** Starting completely fresh or node was restarted

**What it does:**
- Cleans database
- Deploys fresh contract
- Approves 3 test wallets
- Mints tokens (1000, 500, 250)
- Executes 1.5x test split
- Runs indexer
- Shows summary

**Usage:**
```bash
# Make sure Hardhat node is running first!
# Then in a new terminal:
./reset-and-populate.sh
```

**Result:**
- Total supply: 2625 tokens
- Wallet 1: 1500 tokens (57.14%)
- Wallet 2: 750 tokens (28.57%)
- Wallet 3: 375 tokens (14.29%)

---

#### Database-Only Reset (`reset-db-only.sh`)

**Use when:** Database is out of sync but blockchain is fine

**What it does:**
- Removes database only
- Re-indexes all events from blockchain
- Keeps existing contract and transactions

**Usage:**
```bash
# Blockchain and contract must already exist
./reset-db-only.sh
```

---

#### Quick Reference

| Scenario | Script | Prerequisites |
|----------|--------|---------------|
| Full fresh start | `./reset-and-populate.sh` | Node running |
| DB out of sync | `./reset-db-only.sh` | Node + deployed contract |
| Manual reset | See steps above | Node running |

---

### Verification Checklist

After fresh start and repopulation, verify:

```bash
# ✓ Token info shows correct supply
npm run cli token info

# ✓ All wallets show correct balances
npm run cli token balance 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# ✓ Cap table has correct data
npm run cli captable

# ✓ Corporate actions are recorded
npm run cli corporate history

# ✓ All events are indexed
npm run cli -- events --limit 50
```

---

### Common Fresh Start Scenarios

#### Scenario 1: Contract Code Changed

When you modify `ChainEquityToken.sol`:

```bash
# 1. Stop node (Ctrl+C)
# 2. Clear everything
rm -rf backend/data artifacts cache
# 3. Start node
npx hardhat node
# 4. In new terminal, deploy
npx hardhat run scripts/deploy-production.ts --network localhost
cp .env backend/.env
# 5. Repopulate using script above
```

#### Scenario 2: Database Corrupted

When database has issues but contract is fine:

```bash
# 1. Keep node running
# 2. Remove database only
rm -rf backend/data
# 3. Re-index from blockchain
cd backend && npm run test-indexer-local && cd ..
# 4. Verify
npm run cli captable
```

#### Scenario 3: Wrong Contract Address

When `.env` has wrong contract address:

```bash
# 1. Check current contract (look in Hardhat node output)
# 2. Update .env manually with correct address
# 3. Copy to backend
cp .env backend/.env
# 4. Re-index
cd backend && npm run test-indexer-local && cd ..
```

#### Scenario 4: Daily Development Reset

Quick reset for daily testing:

```bash
# 1. Stop node (Ctrl+C)
# 2. Quick clean
rm -rf backend/data
# 3. Restart node
npx hardhat node
# 4. Redeploy and repopulate (in new terminal)
npx hardhat run scripts/deploy-production.ts --network localhost
cp .env backend/.env
./reset-and-populate.sh  # or manual repopulation
```

---

## Starting the Local Blockchain

### 1. Start Hardhat Node

Open a terminal and run:

```bash
npx hardhat node
```

This will:
- Start a local Ethereum node on `http://127.0.0.1:8545`
- Create 20 test accounts with 10,000 ETH each
- Display account addresses and private keys
- Keep the node running (leave this terminal open)

**Important Test Accounts:**
- Account #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (Deployer/Owner)
- Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Test wallet)
- Account #2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (Test wallet)

### 2. Reset Blockchain (if needed)

If you need to reset the blockchain state:

```bash
# Stop the running node (Ctrl+C)
# Restart it
npx hardhat node
```

---

## Deployment

### Deploy the ChainEquityToken Contract

In a new terminal (keep the node running in the first terminal):

```bash
npx hardhat run scripts/deploy-production.ts --network localhost
```

This will:
- Compile the contract (if needed)
- Deploy `ChainEquityToken` to the local network
- Automatically save the contract address to `.env`
- Display deployment details

**Output Example:**
```
✅ Contract Deployed!
Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Transaction Hash: 0x...
```

### Update Backend Environment

Copy the contract address to backend:

```bash
cp .env backend/.env
```

---

## CLI Commands Reference

All CLI commands are run from the project root using:

```bash
npm run cli <command> [options]
```

### Token Information

#### Get Token Info
```bash
npm run cli token info
```
Shows: name, symbol, decimals, total supply, split multiplier

#### Get Balance
```bash
npm run cli token balance <address>
```
Example:
```bash
npm run cli token balance 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

---

### Wallet Management

#### Approve Wallet
Approve an address to send/receive tokens:

```bash
npm run cli wallet approve <address>
```

Example:
```bash
npm run cli wallet approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

#### Revoke Wallet
Revoke wallet approval:

```bash
npm run cli wallet revoke <address>
```

#### Check Wallet Status
```bash
npm run cli wallet status <address>
```

#### List All Approved Wallets
```bash
npm run cli wallet list
```

---

### Token Minting

#### Mint Tokens
Mint tokens to an approved address:

```bash
npm run cli token mint <address> <amount>
```

Examples:
```bash
# Mint 100 tokens
npm run cli token mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100

# Mint 33 tokens
npm run cli token mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 33

# Mint fractional amounts
npm run cli token mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 33.5
```

**Note:** The wallet must be approved before minting.

---

### Corporate Actions

#### Execute Stock Split

Stock splits multiply all token balances by a multiplier using basis points (10,000 = 1.0x).

```bash
npm run cli corporate split <multiplier>
```

**Forward Splits (multiplier > 1):**
```bash
# 2-for-1 split (doubles all balances)
npm run cli corporate split 2

# 7-for-1 split
npm run cli corporate split 7

# 1.5-for-1 split
npm run cli corporate split 1.5

# 1.11-for-1 split
npm run cli corporate split 1.11
```

**Reverse Splits (multiplier < 1):**
```bash
# 1-for-2 reverse split (halves all balances)
npm run cli corporate split 0.5

# 1-for-10 reverse split
npm run cli corporate split 0.1

# 1-for-5 reverse split
npm run cli corporate split 0.2
```

**How it works:**
- Multipliers accumulate: 1.11x followed by 2x = 2.22x total
- Uses fixed-point math (basis points) to avoid rounding errors
- Example: 33 tokens × 1.221 = 40.293 tokens (exact)

#### Update Token Symbol

```bash
npm run cli corporate symbol <new-symbol>
```

Example:
```bash
npm run cli corporate symbol CEQT
```

**Requirements:**
- 3-5 uppercase letters
- Must be unique

#### Update Token Name

```bash
npm run cli corporate name <new-name>
```

Example:
```bash
npm run cli corporate name "ChainEquity Token"
```

#### View Corporate Action History

```bash
npm run cli corporate history [--type <type>]
```

Examples:
```bash
# View all corporate actions
npm run cli corporate history

# View only stock splits
npm run cli corporate history --type StockSplit

# View only symbol changes
npm run cli corporate history --type SymbolChange
```

**Output includes:**
- Date and time
- Action type (StockSplit, SymbolChange, NameChange)
- Details (multiplier, new values)
- Block number
- Transaction hash

---

### Cap Table & Analytics

#### View Cap Table

```bash
npm run cli captable
```

Displays:
- Total supply
- Number of holders
- Current split multiplier
- Table with:
  - Wallet addresses
  - Token balances
  - Ownership percentages

#### View Analytics

```bash
npm run cli analytics
```

Shows:
- Token metrics (supply, holders)
- Transfer statistics
- Corporate action history
- Top holders

---

### Event Management

#### View Blockchain Events

```bash
npm run cli -- events [--type <type>] [--limit <number>]
```

Examples:
```bash
# View all events (last 20)
npm run cli -- events

# View Transfer events only
npm run cli -- events --type Transfer

# View StockSplit events
npm run cli -- events --type StockSplit

# View more events
npm run cli -- events --limit 50
```

**Available Event Types:**
- `Transfer`
- `StockSplit`
- `SymbolChanged`
- `NameChanged`
- `WalletApproved`
- `WalletRevoked`
- `TransferBlocked`

**Note:** The `--` before `events` is required when passing flags with npm.

---

### Indexer

#### Run Local Indexer

The indexer fetches all blockchain events and stores them in the database:

```bash
cd backend
npm run test-indexer-local
cd ..
```

This will:
- Connect to the local Hardhat node
- Fetch all historical events (Transfer, StockSplit, etc.)
- Update the database with events and balances
- Skip duplicate events

**When to run:**
- After deploying the contract
- After executing transactions (minting, splits, etc.)
- Before viewing cap table or analytics

**Automatic indexing:** The CLI commands that view data (captable, analytics) will work with whatever data is currently in the database.

---

## Testing Workflows

### Complete Test Flow

Here's a complete workflow to test all functionality:

```bash
# 1. Start Hardhat node (in terminal 1)
npx hardhat node

# 2. Deploy contract (in terminal 2)
npx hardhat run scripts/deploy-production.ts --network localhost
cp .env backend/.env

# 3. View initial token info
npm run cli token info

# 4. Approve and mint to first wallet
npm run cli wallet approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
npm run cli token mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 100

# 5. Check balance
npm run cli token balance 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# 6. Approve and mint to second wallet
npm run cli wallet approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
npm run cli token mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 33

# 7. Execute a stock split
npm run cli corporate split 1.11

# 8. Check balances after split
npm run cli token balance 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  # Should be 111.0
npm run cli token balance 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC  # Should be 36.63

# 9. Execute another split
npm run cli corporate split 2

# 10. Run indexer
cd backend && npm run test-indexer-local && cd ..

# 11. View cap table
npm run cli captable

# 12. View corporate history
npm run cli corporate history

# 13. View all events
npm run cli -- events
```

### Testing Stock Splits

Test various split scenarios:

```bash
# Forward splits
npm run cli corporate split 2      # 2-for-1
npm run cli corporate split 1.5    # 1.5-for-1
npm run cli corporate split 1.11   # 1.11-for-1

# Reverse splits
npm run cli corporate split 0.5    # 1-for-2
npm run cli corporate split 0.1    # 1-for-10
npm run cli corporate split 0.2    # 1-for-5

# Check accumulated multiplier
npm run cli token info
```

### Testing Decimal Precision

Test that splits don't round incorrectly:

```bash
# Mint 33 tokens
npm run cli wallet approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
npm run cli token mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 33

# Execute 1.11x split
npm run cli corporate split 1.11

# Check balance (should be 36.63, NOT 37)
npm run cli token balance 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

---

## Troubleshooting

### Token Contract Address Not Set

**Error:** `TOKEN_CONTRACT_ADDRESS not set in .env`

**Solution:**
1. Deploy the contract: `npx hardhat run scripts/deploy-production.ts --network localhost`
2. Copy to backend: `cp .env backend/.env`

---

### Connection Refused

**Error:** `ECONNREFUSED 127.0.0.1:8545`

**Solution:**
1. Make sure Hardhat node is running: `npx hardhat node`
2. Check that RPC_URL is correct in `.env`

---

### Wallet Not Approved

**Error:** `NotInAllowlist(address)`

**Solution:**
Approve the wallet before minting:
```bash
npm run cli wallet approve <address>
```

---

### Database Out of Sync

If cap table shows wrong data:

```bash
# Remove old database
rm -rf backend/data

# Run indexer
cd backend && npm run test-indexer-local && cd ..

# View cap table
npm run cli captable
```

---

### npm Flag Parsing Issue

**Error:** `npm warn Unknown cli config "--type"`

**Solution:**
Use `--` before the command:
```bash
# Wrong
npm run cli events --type Transfer

# Correct
npm run cli -- events --type Transfer
```

---

### Reset Everything

To completely reset and start fresh:

```bash
# 1. Stop Hardhat node (Ctrl+C in node terminal)

# 2. Remove database
rm -rf backend/data

# 3. Remove .env files
rm .env backend/.env

# 4. Restart Hardhat node
npx hardhat node

# 5. Redeploy
npx hardhat run scripts/deploy-production.ts --network localhost
cp .env backend/.env

# 6. Start testing again
```

---

## Debug Scripts

### Check Balance with Debug Info

For debugging split multiplier issues:

```bash
npx tsx scripts/check-balance.ts <address>
```

Example:
```bash
npx tsx scripts/check-balance.ts 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Output includes:**
- Split multiplier (basis points and decimal)
- Balance with multiplier applied
- Raw balance (stored on-chain without multiplier)
- Manual calculation verification
- Match confirmation

---

## Network Configuration

### Local Network (Default)

```bash
# All CLI commands default to localhost
npm run cli <command>
```

### Specify Network

```bash
npm run cli <command> --network localhost
```

**Available Networks:**
- `localhost` - Local Hardhat node (default)
- Additional networks can be configured in `hardhat.config.ts`

---

## Additional Resources

- **Project Summary:** See `PROJECT_SUMMARY.md`
- **Quick Start:** See `QUICK_START.md`
- **Testing Guide:** See `TESTING.md`
- **Smart Contract:** `contracts/ChainEquityToken.sol`
- **Backend API:** `backend/src/`

---

## Common Use Cases

### Issue Shares to New Investor

```bash
# 1. Approve investor wallet
npm run cli wallet approve 0x<investor-address>

# 2. Mint shares
npm run cli token mint 0x<investor-address> 1000

# 3. Update cap table
cd backend && npm run test-indexer-local && cd ..
npm run cli captable
```

### Execute Company Stock Split

```bash
# 1. Execute split (e.g., 2-for-1)
npm run cli corporate split 2

# 2. Update records
cd backend && npm run test-indexer-local && cd ..

# 3. View updated cap table
npm run cli captable

# 4. View split history
npm run cli corporate history --type StockSplit
```

### Audit Blockchain History

```bash
# 1. View all events
npm run cli -- events

# 2. View corporate actions
npm run cli corporate history

# 3. Generate cap table report
npm run cli captable

# 4. View analytics
npm run cli analytics
```

---

## Summary of All Commands

```bash
# Token Information
npm run cli token info
npm run cli token balance <address>

# Wallet Management
npm run cli wallet approve <address>
npm run cli wallet revoke <address>
npm run cli wallet status <address>
npm run cli wallet list

# Token Operations
npm run cli token mint <address> <amount>

# Corporate Actions
npm run cli corporate split <multiplier>
npm run cli corporate symbol <new-symbol>
npm run cli corporate name <new-name>
npm run cli corporate history [--type <type>]

# Cap Table & Analytics
npm run cli captable
npm run cli analytics

# Events
npm run cli -- events [--type <type>] [--limit <number>]

# Indexer
cd backend && npm run test-indexer-local && cd ..

# Debug
npx tsx scripts/check-balance.ts <address>
```

---

**Last Updated:** November 4, 2025
**ChainEquity Version:** 1.0.0
