#!/bin/bash

# ChainEquity - Database-Only Reset Script
# This script only resets the database and re-indexes from the existing blockchain
# Use when: Database is out of sync but blockchain/contract are fine
# Prerequisites: Hardhat node must be running with deployed contract

set -e  # Exit on error

echo ""
echo "🔄 ChainEquity Database Reset"
echo "=============================="
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

# Check if contract address is set
if [ -z "$TOKEN_CONTRACT_ADDRESS" ] && ! grep -q "TOKEN_CONTRACT_ADDRESS=" .env 2>/dev/null; then
  echo "❌ Error: TOKEN_CONTRACT_ADDRESS not set!"
  echo "   Deploy contract first: npx hardhat run scripts/deploy-production.ts --network localhost"
  exit 1
fi
echo "✅ Contract address found"
echo ""

# Clean database
echo "🧹 Removing database..."
rm -rf backend/data
echo "✅ Database removed"
echo ""

# Re-index from blockchain
echo "📊 Re-indexing from blockchain..."
cd backend && npm run test-indexer-local
cd ..
echo ""

# Summary
echo "=============================="
echo "✅ Database Reset Complete!"
echo "=============================="
echo ""
echo "🔧 Verify with:"
echo "   $ npm run cli captable"
echo "   $ npm run cli corporate history"
echo ""
