# ChainEquity - Clean Start Guide

Complete guide for resetting and starting the ChainEquity application from scratch.

## Prerequisites

Ensure you have:
- Node.js and npm installed
- Dependencies installed (`npm install` in root, backend, and frontend directories)

---

## Option 1: Simple Setup (No Stock Split)

Creates 2 wallets with 1000 and 500 tokens respectively. No corporate actions.

### Step 1: Clean Environment

```bash
# Kill any running processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8545 | xargs kill -9 2>/dev/null || true

# Delete database
rm -f backend/data/chainequity.db*
```

### Step 2: Start Hardhat Node

```bash
# Terminal 1 - from project root
npx hardhat node
```

Keep this running. It provides a local Ethereum blockchain.

### Step 3: Deploy Contract and Setup Test Data

```bash
# Terminal 2 - from project root
npx hardhat run scripts/deploy.ts --network localhost
```

This will:
- Deploy ChainEquityToken contract
- Approve 2 test wallets
- Mint 1000 tokens to wallet 1 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)
- Mint 500 tokens to wallet 2 (0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC)
- Display contract address

**Important:** Copy the contract address from the output!

### Step 4: Update Environment

```bash
# Update backend/.env with the new contract address
# Replace <CONTRACT_ADDRESS> with the address from step 3
echo "TOKEN_CONTRACT_ADDRESS=<CONTRACT_ADDRESS>" >> backend/.env
```

Or manually edit `backend/.env` and update the `TOKEN_CONTRACT_ADDRESS` line.

### Step 5: Index Blockchain Events

```bash
# Terminal 2
cd backend
npm run build
npm run test-indexer-local
cd ..
```

This creates the database and indexes all blockchain events.

### Step 6: Start Backend Server

```bash
# Terminal 3
cd backend
npm run dev
```

Backend API will be available at http://localhost:3000 (or PORT specified in .env)

### Step 7: (Optional) Start Indexer for Live Updates

```bash
# Terminal 4
cd backend
npm run dev:indexer
```

This continuously monitors blockchain for new events.

### Step 8: Start Frontend

```bash
# Terminal 5
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3001 (or next available port)

### Result

- Wallet 1: 1000 CEQ tokens
- Wallet 2: 500 CEQ tokens
- Total Supply: 1500 CEQ tokens
- No stock splits or corporate actions

---

## Option 2: Full Setup (With Stock Split)

Creates 3 wallets with tokens and executes a 1.5x stock split.

### Quick Command

```bash
# Make sure Hardhat node is running first
npx hardhat node

# Then in another terminal, from project root:
./reset-and-populate.sh
```

This automated script will:
1. Clean database
2. Deploy fresh contract
3. Approve 3 test wallets
4. Mint tokens:
   - Wallet 1: 1000 CEQ
   - Wallet 2: 500 CEQ
   - Wallet 3: 250 CEQ
5. Execute 1.5x stock split
6. Index all events

### Manual Steps (if script doesn't work)

Follow Option 1 steps 1-2, then:

**Step 3: Deploy with production script**
```bash
npx hardhat run scripts/deploy-production.ts --network localhost
```

**Step 4-6: Follow Option 1 steps 4-6**

**Step 7: Create test transactions**
```bash
# Approve wallets
npm run cli wallet approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
npm run cli wallet approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
npm run cli wallet approve 0x90F79bf6EB2c4f870365E785982E1f101E93b906

# Mint tokens
npm run cli token mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000
npm run cli token mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 500
npm run cli token mint 0x90F79bf6EB2c4f870365E785982E1f101E93b906 250

# Execute stock split
npm run cli corporate split 1.5

# Re-index
cd backend && npm run test-indexer-local && cd ..
```

**Step 8-10: Follow Option 1 steps 6-8**

### Result

- Wallet 1: 1500 CEQ tokens (1000 × 1.5)
- Wallet 2: 750 CEQ tokens (500 × 1.5)
- Wallet 3: 375 CEQ tokens (250 × 1.5)
- Total Supply: 2625 CEQ tokens
- 1 corporate action (1.5x stock split)

---

## Option 3: Database-Only Reset

Use when blockchain/contract are fine but database is out of sync.

```bash
# Make sure Hardhat node is running and contract is deployed
./reset-db-only.sh
```

This will:
1. Delete database
2. Re-index from existing blockchain

---

## Test Wallet Addresses

These are Hardhat's default test accounts:

```bash
# Account #0 (Deployer/Owner)
export OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Account #1 (Test Wallet 1)
export WALLET_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Account #2 (Test Wallet 2)
export WALLET_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Account #3 (Test Wallet 3)
export WALLET_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

Use these addresses when testing with MetaMask or the CLI.

---

## Verification Commands

After setup, verify everything is working:

```bash
# View cap table
npm run cli captable

# View corporate history
npm run cli corporate history

# View token info
npm run cli token info

# Check specific balance
npm run cli token balance <WALLET_ADDRESS>
```

---

## Port Configuration

Default ports:
- Hardhat Node: `8545`
- Backend API: `3000` (configurable via `PORT` in backend/.env)
- Frontend: `3001` (or next available port)

If you get port conflicts, check what's running:
```bash
lsof -ti:3000  # Check backend port
lsof -ti:8545  # Check Hardhat port
```

Kill processes on specific ports:
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Troubleshooting

### "Port already in use"
```bash
# Find and kill the process
lsof -ti:<PORT> | xargs kill -9
```

### "Contract not found" errors
- Ensure contract address in `backend/.env` matches deployed contract
- Verify Hardhat node is running
- Re-run deployment script

### Database errors
```bash
# Nuclear option - delete everything and start fresh
rm -rf backend/data
rm -rf cache artifacts
npx hardhat clean
npx hardhat compile
# Then follow Option 1 or 2 from the beginning
```

### Frontend can't connect to backend
- Check backend is running on expected port
- Verify `NEXT_PUBLIC_API_URL` in frontend/.env.local
- Check CORS settings if accessing from different origin

---

## Summary of Terminal Windows

For full operation, you'll have:

1. **Terminal 1**: Hardhat node (`npx hardhat node`)
2. **Terminal 2**: One-time commands (deploy, CLI operations)
3. **Terminal 3**: Backend server (`cd backend && npm run dev`)
4. **Terminal 4**: (Optional) Indexer (`cd backend && npm run dev:indexer`)
5. **Terminal 5**: Frontend (`cd frontend && npm run dev`)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Clean database | `rm -f backend/data/chainequity.db*` |
| Start Hardhat | `npx hardhat node` |
| Deploy (simple) | `npx hardhat run scripts/deploy.ts --network localhost` |
| Deploy (full) | `./reset-and-populate.sh` |
| Index events | `cd backend && npm run test-indexer-local` |
| Start backend | `cd backend && npm run dev` |
| Start indexer | `cd backend && npm run dev:indexer` |
| Start frontend | `cd frontend && npm run dev` |
| View cap table | `npm run cli captable` |
| Check balance | `npm run cli token balance <ADDRESS>` |

---

## Notes

- Always start Hardhat node **before** running deployment scripts
- After deploying a new contract, update `TOKEN_CONTRACT_ADDRESS` in backend/.env
- The indexer service populates the database from blockchain events
- Use Option 1 for simple testing, Option 2 for comprehensive demos
- Database is SQLite, stored in `backend/data/chainequity.db`
