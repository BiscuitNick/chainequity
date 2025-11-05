# ChainEquity CLI Complete Testing Guide

Complete walkthrough for testing all CLI functionality on local Hardhat network.

## Prerequisites

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contract and setup
npx hardhat run scripts/deploy-local.ts --network localhost

# Terminal 3: Run indexer (for cap-table/events)
cd backend && npm run test-indexer-local

# Terminal 4: CLI testing (this terminal)
```

## Test Wallet Addresses (Hardhat Default)

```bash
# Account #0 (Owner/Deployer)
OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Account #1 (Test User 1)
USER1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Account #2 (Test User 2)
USER2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Account #3 (Test User 3)
USER3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

## 1. Token Information Commands

### Get token info
```bash
npm run cli token info

# Expected output:
# ✓ Name, Symbol, Decimals, Total Supply, Split Multiplier
```

### Check balance
```bash
# Check owner balance
npm run cli token balance $OWNER

# Check empty wallet
npm run cli token balance $USER1

# Expected: Owner has tokens, USER1 has 0
```

---

## 2. Wallet Allowlist Management

### Check wallet status
```bash
# Check owner (should be approved from deployment)
npm run cli wallet status $OWNER

# Check unapproved wallet
npm run cli wallet status $USER1

# Expected: Owner approved, USER1 not approved
```

### Approve wallets
```bash
# Approve USER1
npm run cli wallet approve $USER1

# Approve USER2
npm run cli wallet approve $USER2

# Expected: Success messages with TX hashes
```

### List approved wallets
```bash
npm run cli wallet list

# Expected: Table showing Owner, USER1, USER2
```

### Revoke a wallet
```bash
# Revoke USER2
npm run cli wallet revoke $USER2

# Verify revoked
npm run cli wallet status $USER2

# Expected: USER2 no longer approved
```

### Re-approve for testing
```bash
# Re-approve USER2 for later tests
npm run cli wallet approve $USER2
```

---

## 3. Token Minting

### Mint to approved wallets
```bash
# Mint 1000 tokens to USER1
npm run cli token mint $USER1 1000

# Mint 500 tokens to USER2
npm run cli token mint $USER2 500

# Mint 250 tokens to USER3 (will fail - not approved)
npm run cli wallet approve $USER3
npm run cli token mint $USER3 250

# Expected: First two succeed, third succeeds after approval
```

### Verify balances
```bash
npm run cli token balance $OWNER
npm run cli token balance $USER1
npm run cli token balance $USER2
npm run cli token balance $USER3

# Expected: Balances match minted amounts
```

### Check total supply
```bash
npm run cli token info

# Expected: Total supply = Owner's initial + 1000 + 500 + 250
```

---

## 4. Corporate Actions

### Execute forward stock split (2-for-1)
```bash
# Before split - check balances
npm run cli token balance $USER1
npm run cli token info

# Execute 2-for-1 forward split
npm run cli corporate split 2

# After split - check balances (should double)
npm run cli token balance $USER1
npm run cli token info

# Expected: All balances and total supply doubled
```

### Execute reverse stock split (1-for-10)
```bash
# Execute 1-for-10 reverse split (0.1x multiplier)
npm run cli corporate split 0.1

# Check balances (should be 1/10th of previous)
npm run cli token balance $USER1

# Expected: All balances reduced to 10%
```

### Execute another forward split (7-for-1)
```bash
npm run cli corporate split 7

# Expected: All balances multiplied by 7
```

### Update token symbol
```bash
# Get current symbol
npm run cli token info

# Update symbol
npm run cli corporate symbol NEWCEQ

# Verify change
npm run cli token info

# Change back
npm run cli corporate symbol CEQ

# Expected: Symbol changes reflected
```

### View corporate action history
```bash
# All corporate actions
npm run cli corporate history

# Only stock splits
npm run cli corporate history --type StockSplit

# Only symbol changes
npm run cli corporate history --type SymbolChanged

# Expected: Table showing all splits and symbol changes with details
```

---

## 5. Cap-Table Generation

### Generate cap-table (requires indexer)
```bash
# Make sure indexer has run (Terminal 3)
cd backend && npm run test-indexer-local
cd ..

# Generate cap-table
npm run cli captable

# Expected: Table showing all holders with balances and ownership %
```

### Export cap-table to CSV
```bash
npm run cli captable --format csv --output captable.csv
cat captable.csv

# Expected: CSV file with cap-table data
```

### Export cap-table to JSON
```bash
npm run cli captable --format json --output captable.json
cat captable.json | jq .

# Expected: JSON file with cap-table data
```

---

## 6. Events Viewing

### View all recent events
```bash
npm run cli events

# Expected: Table showing recent transfers, approvals, splits, etc.
```

### Filter by event type
```bash
# View only transfers
npm run cli events --type Transfer

# View only wallet approvals
npm run cli events --type WalletApproved

# View only stock splits
npm run cli events --type StockSplit

# View only symbol changes
npm run cli events --type SymbolChanged

# Expected: Filtered events for each type
```

### Increase event limit
```bash
npm run cli events --limit 50

# Expected: Up to 50 recent events
```

---

## 7. Analytics

### View ownership analytics
```bash
npm run cli analytics

# Expected:
# - Total holders count
# - Median and average holdings
# - Top 10 concentration percentage
# - HHI (Herfindahl-Hirschman Index)
# - Top 5 holders table
```

---

## 8. Error Handling Tests

### Try to mint to unapproved wallet
```bash
# Create a wallet that's not approved
UNAPPROVED=0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65

npm run cli token mint $UNAPPROVED 100

# Expected: Error - wallet not approved
```

### Try invalid split multiplier
```bash
# Zero multiplier
npm run cli corporate split 0

# Multiplier of 1 (no effect)
npm run cli corporate split 1

# Negative multiplier
npm run cli corporate split -2

# Expected: Validation errors
```

### Try invalid addresses
```bash
# Invalid address format
npm run cli wallet approve 0xinvalid

# Expected: Error
```

---

## 9. Full Integration Test Workflow

Complete workflow testing all features together:

```bash
#!/bin/bash

echo "=== ChainEquity CLI Full Integration Test ==="
echo ""

# Setup test addresses
OWNER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
USER1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
USER2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

echo "1. Check initial token info"
npm run cli token info

echo ""
echo "2. Approve test wallets"
npm run cli wallet approve $USER1
npm run cli wallet approve $USER2

echo ""
echo "3. Mint tokens"
npm run cli token mint $USER1 1000
npm run cli token mint $USER2 500

echo ""
echo "4. Check balances"
npm run cli token balance $USER1
npm run cli token balance $USER2

echo ""
echo "5. Execute 2-for-1 stock split"
npm run cli corporate split 2

echo ""
echo "6. Verify doubled balances"
npm run cli token balance $USER1
npm run cli token balance $USER2

echo ""
echo "7. Update symbol"
npm run cli corporate symbol TEST
npm run cli token info
npm run cli corporate symbol CEQ

echo ""
echo "8. Run indexer"
cd backend && npm run test-indexer-local
cd ..

echo ""
echo "9. Generate cap-table"
npm run cli captable

echo ""
echo "10. View analytics"
npm run cli analytics

echo ""
echo "11. View events"
npm run cli events --limit 20

echo ""
echo "12. View corporate action history"
npm run cli corporate history

echo ""
echo "=== Test Complete ==="
```

Save as `test-cli-full.sh`, make executable, and run:
```bash
chmod +x test-cli-full.sh
./test-cli-full.sh
```

---

## 10. Advanced Testing

### Test with Polygon Amoy (testnet)

```bash
# Use --network flag for all commands
npm run cli token info --network polygonAmoy
npm run cli wallet approve $ADDRESS --network polygonAmoy
npm run cli token mint $ADDRESS 100 --network polygonAmoy

# Note: Requires ALCHEMY_API_KEY in .env
```

### Test concurrent operations
```bash
# Open multiple terminals and run simultaneously
# Terminal A:
npm run cli token mint $USER1 100

# Terminal B:
npm run cli token mint $USER2 100

# Expected: Both succeed with different nonces
```

---

## Expected Results Summary

After running all tests, you should have:

1. **Token Info**: Multiple splits applied, symbol potentially changed
2. **Wallets**: 3-4 approved wallets
3. **Balances**: Multiple addresses with varying token amounts
4. **Events**: 20+ events (approvals, mints, transfers, splits)
5. **Corporate Actions**: 3+ stock splits, 1+ symbol changes
6. **Cap-Table**: Accurate ownership distribution
7. **Analytics**: Correct concentration metrics

---

## Cleanup & Reset

To start fresh:
```bash
# Stop all processes (Hardhat, indexer, backend)
# Delete database
rm backend/data/chainequity.db

# Restart Hardhat node (clears blockchain)
npx hardhat node

# Redeploy contract
npx hardhat run scripts/deploy-local.ts --network localhost

# Restart indexer
cd backend && npm run test-indexer-local
```

---

## Troubleshooting

### "Network localhost not configured"
- Make sure Hardhat node is running on port 8545
- Check .env has correct TOKEN_CONTRACT_ADDRESS

### "Failed to fetch events" / "No events found"
- Run the indexer first: `cd backend && npm run test-indexer-local`
- Check database exists: `ls backend/data/chainequity.db`

### "Transaction reverted"
- Make sure wallet is approved before minting
- Verify you're using the owner account (DEPLOYER_PRIVATE_KEY)

### "Invalid multiplier"
- Multiplier must be > 0 and ≠ 1
- Use decimals for reverse splits (0.1, 0.5, etc.)

---

## CLI Command Reference

```bash
# Wallet commands
npm run cli wallet approve <address>
npm run cli wallet revoke <address>
npm run cli wallet status <address>
npm run cli wallet list

# Token commands
npm run cli token mint <to> <amount>
npm run cli token balance <address>
npm run cli token info

# Corporate actions
npm run cli corporate split <multiplier>
npm run cli corporate symbol <newSymbol>
npm run cli corporate history [--type <type>]

# Reporting
npm run cli captable [--format csv|json] [--output <file>]
npm run cli events [--type <type>] [--limit <number>]
npm run cli analytics

# Network option (all commands)
--network localhost      # Local Hardhat (default)
--network polygonAmoy    # Polygon Amoy testnet
```
