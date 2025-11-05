# ChainEquity Quick Reference

One-page cheat sheet for common operations.

---

## Setup & Reset

```bash
# Start Hardhat node (terminal 1, keep running)
npx hardhat node

# Full reset with test data (terminal 2)
./reset-and-populate.sh

# Database-only reset (when blockchain is fine)
./reset-db-only.sh

# Manual deployment
npx hardhat run scripts/deploy-production.ts --network localhost
cp .env backend/.env
```

---

## Test Wallet Addresses

```bash
# Hardhat's default test accounts
WALLET_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8  # Account #1
WALLET_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC  # Account #2
WALLET_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906  # Account #3
```

---

## Common Commands

### View Information
```bash
npm run cli token info              # Token details + total supply
npm run cli captable                # Cap table with ownership %
npm run cli corporate history       # All corporate actions
npm run cli -- events               # All blockchain events
npm run cli token balance <address> # Check wallet balance
```

### Wallet Management
```bash
npm run cli wallet approve <address>   # Approve wallet
npm run cli wallet revoke <address>    # Revoke wallet
npm run cli wallet status <address>    # Check approval status
npm run cli wallet list                # List all approved wallets
```

### Issue Shares
```bash
# 1. Approve wallet
npm run cli wallet approve 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# 2. Mint tokens
npm run cli token mint 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 1000

# 3. Update database
cd backend && npm run test-indexer-local && cd ..

# 4. View updated cap table
npm run cli captable
```

### Stock Splits
```bash
# Forward splits (multiply balances)
npm run cli corporate split 2      # 2-for-1 (2x)
npm run cli corporate split 1.5    # 1.5-for-1
npm run cli corporate split 1.11   # 1.11-for-1

# Reverse splits (reduce balances)
npm run cli corporate split 0.5    # 1-for-2 (halves)
npm run cli corporate split 0.1    # 1-for-10
```

### Corporate Actions
```bash
npm run cli corporate symbol CEQT              # Change symbol
npm run cli corporate name "New Name"          # Change name
npm run cli corporate history                  # View all actions
npm run cli corporate history --type StockSplit # Filter by type
```

---

## Basis Points Reference

Stock splits use basis points (10,000 = 1.0x):

| Multiplier | Basis Points | Type | Effect |
|------------|--------------|------|---------|
| 2.0x | 20000 | Forward | 2-for-1 split (doubles) |
| 1.5x | 15000 | Forward | 1.5-for-1 split |
| 1.11x | 11100 | Forward | 1.11-for-1 split |
| 1.0x | 10000 | None | No change (invalid) |
| 0.5x | 5000 | Reverse | 1-for-2 (halves) |
| 0.1x | 1000 | Reverse | 1-for-10 split |

**Multipliers accumulate:**
- 1.11x → 2x → 0.5x = 1.11 × 2 × 0.5 = 1.11x total

---

## Database & Indexer

```bash
# Run indexer (updates database from blockchain)
cd backend && npm run test-indexer-local && cd ..

# Reset database only (re-indexes from blockchain)
./reset-db-only.sh

# Remove database
rm -rf backend/data
```

---

## Verification & Debug

```bash
# Check balance with debug info
npx tsx scripts/check-balance.ts 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# View events with filters
npm run cli -- events --type Transfer
npm run cli -- events --type StockSplit
npm run cli -- events --limit 50

# Check token info
npm run cli token info

# View cap table
npm run cli captable
```

---

## Common Workflows

### Daily Testing Reset
```bash
# 1. Stop node (Ctrl+C)
# 2. Restart node
npx hardhat node

# 3. In new terminal
./reset-and-populate.sh
```

### Test Decimal Precision
```bash
# Mint 33 tokens
npm run cli wallet approve 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
npm run cli token mint 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 33

# Execute 1.11x split
npm run cli corporate split 1.11

# Balance should be 36.63 (NOT 37)
npm run cli token balance 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

### Multiple Splits
```bash
# Execute sequence of splits
npm run cli corporate split 1.5   # 1.5x
npm run cli corporate split 2     # 1.5 × 2 = 3x
npm run cli corporate split 0.5   # 3 × 0.5 = 1.5x

# View accumulated multiplier
npm run cli token info  # Should show 1.5x multiplier
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `TOKEN_CONTRACT_ADDRESS not set` | Deploy: `npx hardhat run scripts/deploy-production.ts --network localhost` then `cp .env backend/.env` |
| `ECONNREFUSED 127.0.0.1:8545` | Start Hardhat node: `npx hardhat node` |
| `NotInAllowlist` | Approve wallet first: `npm run cli wallet approve <address>` |
| Cap table empty | Run indexer: `cd backend && npm run test-indexer-local && cd ..` |
| Wrong balances | Reset DB: `./reset-db-only.sh` |
| `npm warn --type` | Use double dash: `npm run cli -- events --type Transfer` |

---

## File Structure

```
chainequity/
├── reset-and-populate.sh      # Full reset + test data
├── reset-db-only.sh           # Database-only reset
├── CLI_GUIDE.md               # Complete guide (this file's big brother)
├── QUICK_REFERENCE.md         # This file
├── .env                       # Root environment (contract address)
├── backend/
│   ├── .env                   # Backend environment (copy of root)
│   └── data/                  # SQLite database
├── contracts/
│   └── ChainEquityToken.sol   # Smart contract
├── scripts/
│   ├── deploy-production.ts   # Deployment script
│   └── check-balance.ts       # Debug script
└── cli.ts                     # CLI entry point
```

---

## Quick Test Flow

```bash
# Terminal 1: Start node
npx hardhat node

# Terminal 2: Reset and test
./reset-and-populate.sh
npm run cli captable
npm run cli corporate history

# Test split
npm run cli corporate split 2
cd backend && npm run test-indexer-local && cd ..
npm run cli captable

# Verify
npm run cli token info
```

---

## Environment Variables

**Root `.env`:**
```bash
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TOKEN_CONTRACT_ADDRESS=  # Auto-set by deployment script
```

**Backend `.env`:** (Copy of root)
```bash
TOKEN_CONTRACT_ADDRESS=
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ISSUER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://127.0.0.1:8545
```

---

**See CLI_GUIDE.md for detailed explanations and examples.**
