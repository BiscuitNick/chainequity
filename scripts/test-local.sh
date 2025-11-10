#!/bin/bash

echo ""
echo "🚀 ChainEquity Local Test"
echo "================================"
echo ""

# Step 1: Start local Hardhat node in background
echo "📦 Starting local Hardhat blockchain..."
npx hardhat node > /dev/null 2>&1 &
NODE_PID=$!
sleep 3

echo "✅ Local blockchain running (PID: $NODE_PID)"
echo ""

# Step 2: Deploy contract
echo "🔨 Deploying ChainEquityToken..."
npx hardhat run scripts/deploy-local.ts --network localhost

echo ""
echo "================================"
echo "✅ Test Complete!"
echo ""
echo "To interact with your contract:"
echo "  npx hardhat console --network localhost"
echo ""
echo "To stop the local blockchain:"
echo "  kill $NODE_PID"
echo ""
