#!/bin/bash

# ChainEquity - Reset and Repopulate Script
# This script performs a full reset and repopulation with test data
# Prerequisites: Hardhat node must be running in another terminal

set -e  # Exit on error

echo ""
echo "🔄 ChainEquity Reset & Repopulate"
echo "=================================="
echo ""

# Check if Hardhat node is running
echo "📡 Checking if Hardhat node is running..."
if ! curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545 > /dev/null 2>&1; then
  echo "❌ Error: Hardhat node is not running!"
  echo "   Please start it in another terminal: npx hardhat node"
  exit 1
fi
echo "✅ Hardhat node is running"
echo ""

# Clean up
echo "🧹 Cleaning up database..."
rm -rf backend/data
echo "✅ Database cleaned"
echo ""

# Deploy contract
echo "🚀 Deploying contract..."
npx hardhat run scripts/deploy-production.ts --network localhost
echo ""

# Update backend environment
echo "📋 Updating backend environment..."
cp .env backend/.env
echo "✅ Backend environment updated"
echo ""

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build > /dev/null 2>&1
cd ..
echo "✅ Backend built"
echo ""

# Test wallet addresses (Hardhat's default test accounts)
WALLET_1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8  # Account #1
WALLET_2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC  # Account #2
WALLET_3=0x90F79bf6EB2c4f870365E785982E1f101E93b906  # Account #3

echo "👥 Setting up test wallets..."
echo "   Wallet 1: $WALLET_1"
echo "   Wallet 2: $WALLET_2"
echo "   Wallet 3: $WALLET_3"
echo ""

# Approve wallets
echo "✓ Approving wallets..."
npm run cli wallet approve $WALLET_1 > /dev/null 2>&1
npm run cli wallet approve $WALLET_2 > /dev/null 2>&1
npm run cli wallet approve $WALLET_3 > /dev/null 2>&1
echo "✅ Wallets approved"
echo ""

# Mint tokens
echo "💰 Minting tokens..."
echo "   1000 tokens → Wallet 1"
npm run cli token mint $WALLET_1 1000 > /dev/null 2>&1
echo "   500 tokens → Wallet 2"
npm run cli token mint $WALLET_2 500 > /dev/null 2>&1
echo "   250 tokens → Wallet 3"
npm run cli token mint $WALLET_3 250 > /dev/null 2>&1
echo "✅ Tokens minted"
echo ""

# Execute test split
echo "📈 Executing test stock split (1.5x)..."
npm run cli corporate split 1.5 > /dev/null 2>&1
echo "✅ Stock split executed"
echo ""

# Run indexer
echo "📊 Indexing blockchain events..."
cd backend && npm run test-indexer-local > /dev/null 2>&1 && cd ..
echo "✅ Events indexed"
echo ""

# Summary
echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "   Total Supply: 2625 tokens (1750 × 1.5 split)"
echo "   Wallet 1: 1500 tokens (57.14%)"
echo "   Wallet 2: 750 tokens (28.57%)"
echo "   Wallet 3: 375 tokens (14.29%)"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "   View cap table:"
echo "   $ npm run cli captable"
echo ""
echo "   View corporate history:"
echo "   $ npm run cli corporate history"
echo ""
echo "   View token info:"
echo "   $ npm run cli token info"
echo ""
echo "   Test wallet addresses:"
echo "   $ export WALLET_1=$WALLET_1"
echo "   $ export WALLET_2=$WALLET_2"
echo "   $ export WALLET_3=$WALLET_3"
echo ""
