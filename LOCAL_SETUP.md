# ChainEquity Local Development Setup

Quick guide for running ChainEquity locally with Hardhat.

---

## Prerequisites

- Node.js installed
- MetaMask wallet (optional, for UI testing)

---

## Quick Start

### 1. Start Hardhat Node (Terminal 1)

```bash
npx hardhat node
```

This starts a local blockchain at `http://127.0.0.1:8545` with 20 pre-funded test accounts.

**Keep this running!** You'll see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

### 2. Deploy Contract (Terminal 2)

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**Expected Output:**
```
Deploying ChainEquityToken...
Contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Issuer address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Note**: Contract address should be `0x5FbDB2315678afecb367f032d93F642f64180aa3` (default first deployment)

### 3. Start Backend with Auto-Indexer (Terminal 2)

```bash
cd backend
AUTO_INDEX=true npm start
```

This starts:
- Backend API on port 4000
- Auto-indexer that watches for new blocks and syncs events automatically

**Expected Output:**
```
🤖 Starting Auto-Indexer for Local Development
============================================================
WebSocket URL: ws://127.0.0.1:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
============================================================
✅ Auto-indexer started successfully
👀 Watching for new blocks...

╔═══════════════════════════════════════════╗
║   ChainEquity Backend Server Started     ║
╠═══════════════════════════════════════════╣
║ Environment: development                  ║
║ Port:        4000                         ║
║ Database:    ./data/chainequity.db        ║
╚═══════════════════════════════════════════╝
```

### 4. Start Frontend (Terminal 3)

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 15.1.3
  - Local:        http://localhost:3050
  - Network:      http://192.168.x.x:3050

 ✓ Starting...
 ✓ Ready in 2.3s
```

### 5. Open Application

Open browser to: **http://localhost:3050**

---

## Using MetaMask with Local Hardhat

### Add Local Network to MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### Import Test Account

1. In MetaMask, click account icon → "Add account or hardware wallet"
2. Select "Import account"
3. Paste Hardhat Account #0 private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Name it "Hardhat Test Account #0" or similar

**This account has:**
- 10,000 ETH (for gas)
- 1,000 CEQ tokens (initial mint from contract deployment)
- Issuer role (can approve wallets, execute stock splits, etc.)

### Connect Wallet

1. On http://localhost:3050, click "Connect Wallet"
2. Select MetaMask
3. Choose "Hardhat Test Account #0"
4. Approve connection
5. Switch to "Hardhat Local" network if not already

---

## Common Tasks

### Test a Transfer

1. In MetaMask, import a second test account (Account #1):
   ```
   Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
   Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   ```
2. In the app, go to "Transfers"
3. Approve the second wallet address first (as issuer)
4. Send tokens to the second address
5. Check Event History - should see the transfer event immediately

### Execute a Stock Split

1. Go to "Corporate Actions"
2. Click "Stock Split"
3. Enter multiplier (e.g., 2 for 2-for-1 split)
4. Submit transaction
5. All balances will update automatically

### View Events

- Event History page shows all blockchain events in real-time
- Auto-indexer captures events as blocks are mined
- Database is SQLite at `backend/data/chainequity.db`

---

## Troubleshooting

### "Nonce too high" Error

**Problem**: Hardhat node was restarted but MetaMask still has old transaction history

**Solution**:
1. In MetaMask, go to Settings → Advanced → Clear activity tab data
2. Refresh the page

### Contract Not Found

**Problem**: Contract address mismatch

**Solution**:
1. Check the deployed contract address from Terminal 2
2. Verify it matches in all `.env` files:
   - Root `.env`: `TOKEN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - `backend/.env`: Same
   - `frontend/.env.local`: `NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Auto-Indexer Not Working

**Problem**: Events not showing in UI

**Solution**:
- Make sure backend was started with `AUTO_INDEX=true npm start`
- Check Terminal 2 for auto-indexer logs
- If you see errors, restart Hardhat node and redeploy

### Port Already in Use

**Problem**: Port 4000 or 3050 already taken

**Solution**:
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Kill process on port 3050
lsof -ti:3050 | xargs kill -9
```

### Database Issues

**Problem**: Stale data or errors

**Solution**:
```bash
cd backend
rm -rf data/chainequity.db*
# Restart backend
AUTO_INDEX=true npm start
```

---

## Architecture

### How Auto-Indexing Works (Local Development)

1. **Hardhat Node** mines new blocks when transactions are submitted
2. **Auto-Indexer** (WebSocket connection):
   - Listens for new block events
   - Debounces rapid block creation (400ms)
   - Queries contract for events in new blocks
   - Saves events to SQLite database
   - Updates balances automatically
3. **Backend API** serves data from database
4. **Frontend** fetches from API and displays in real-time

### Key Differences from Testnet

| Feature | Local Development | Testnet (Polygon Amoy) |
|---------|------------------|----------------------|
| Gas Costs | Free (unlimited ETH) | Requires testnet MATIC |
| Speed | Instant (mines on tx) | ~2 seconds per block |
| Reset | Restart node → clean slate | Permanent blockchain |
| Event Indexing | Auto-indexer (AUTO_INDEX=true) | Separate indexer service |
| Historical Sync | Not needed (starts fresh) | Run `npm run sync-testnet` |

---

## File Locations

### Configuration Files

All configured for **local Hardhat**:

```
.env                           # Root - Hardhat keys, local contract address
backend/.env                   # Backend - USE_LOCAL_NETWORK=true
frontend/.env.local            # Frontend - Local contract address
backend/constructor-args.js    # Hardhat account #0 as issuer
```

### Database

```
backend/data/chainequity.db    # SQLite database (auto-created)
```

### Contract

```
contracts/ChainEquityToken.sol           # Main contract
scripts/deploy.ts                        # Deployment script
backend/config/alchemy.config.js         # Contract ABI
```

---

## Switching to Testnet

See `TESTNET_DEPLOYMENT.md` for full guide.

**Quick steps:**
1. Comment `USE_LOCAL_NETWORK=true` in `backend/.env`
2. Update contract addresses to testnet in all `.env` files
3. Switch private keys to your testnet wallet
4. Run `npm run sync-testnet` to fetch historical events
5. Start indexer separately: `npm run dev:indexer`

---

## Default Hardhat Test Accounts

The first 3 accounts for easy reference:

```
Account #0 (Issuer):
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Key:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1:
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Key:     0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2:
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Key:     0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

All have 10,000 ETH for testing.

---

## Useful Commands

### View Database

```bash
cd backend
sqlite3 data/chainequity.db

# In SQLite prompt:
.tables                     # Show all tables
SELECT * FROM events;       # View all events
SELECT * FROM balances;     # View all balances
.quit
```

### Reset Everything

```bash
# 1. Stop all services (Ctrl+C in each terminal)

# 2. Clear database
cd backend
rm -rf data/chainequity.db*

# 3. Restart Hardhat node
npx hardhat node

# 4. Redeploy contract
npx hardhat run scripts/deploy.ts --network localhost

# 5. Restart backend
cd backend
AUTO_INDEX=true npm start

# 6. Restart frontend
cd frontend
npm run dev
```

---

**Last Updated**: 2025-11-09
