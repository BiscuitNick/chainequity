#!/bin/bash
set -e

echo "🚀 Starting ChainEquity Hardhat Node with Auto-Deploy"
echo "======================================================"

# Start Hardhat node in background
echo "📡 Starting Hardhat node..."
npx hardhat node --hostname 0.0.0.0 &
HARDHAT_PID=$!

# Wait for Hardhat to be ready
echo "⏳ Waiting for Hardhat node to be ready..."
sleep 5

# Check if Hardhat is running
if ! kill -0 $HARDHAT_PID 2>/dev/null; then
    echo "❌ Hardhat node failed to start"
    exit 1
fi

echo "✅ Hardhat node is running on http://0.0.0.0:8545"

# Compile contracts
echo "🔨 Compiling smart contracts..."
npx hardhat compile

# Deploy contracts to local network
echo "🚢 Deploying ChainEquityToken to local network..."
HARDHAT_NETWORK=localhost npx hardhat run scripts/deploy-production.ts --network localhost

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "✅ Contract deployed successfully!"

    # Extract contract address and make it available
    CONTRACT_ADDRESS=$(grep TOKEN_CONTRACT_ADDRESS .env | cut -d'=' -f2)
    echo "📋 Contract Address: $CONTRACT_ADDRESS"

    # Copy .env to shared volume if it exists
    if [ -d "/shared" ]; then
        cp .env /shared/.env
        echo "📤 Contract address shared with other services"
    fi
else
    echo "❌ Contract deployment failed"
    kill $HARDHAT_PID
    exit 1
fi

echo ""
echo "======================================================"
echo "✅ ChainEquity Local Blockchain Ready!"
echo "======================================================"
echo "RPC URL: http://hardhat:8545 (internal)"
echo "RPC URL: http://localhost:8545 (external)"
echo "Contract Address: $(grep TOKEN_CONTRACT_ADDRESS .env | cut -d'=' -f2)"
echo "======================================================"
echo ""

# Keep the script running and monitor Hardhat
wait $HARDHAT_PID
