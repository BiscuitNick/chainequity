#!/bin/bash

# Setup script for local development environment
# This creates a .env.local file with Hardhat's default test account

echo "🔧 Setting up local development environment..."

# Hardhat's first default account private key
# This is PUBLIC and only for local testing - NEVER use on mainnet!
DEFAULT_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

cat > .env.local << EOF
# ============================================
# Local Development Environment
# ============================================
# These are Hardhat's default test accounts
# ONLY for local testing - DO NOT use on real networks!

# Contract address (will be set after deployment)
TOKEN_CONTRACT_ADDRESS=""

# Hardhat default account #0 private key
DEPLOYER_PRIVATE_KEY="${DEFAULT_PRIVATE_KEY}"
ISSUER_PRIVATE_KEY="${DEFAULT_PRIVATE_KEY}"

# Local network RPC
RPC_URL="http://127.0.0.1:8545"

# Not needed for local testing
ALCHEMY_API_KEY=""
POLYGONSCAN_API_KEY=""
EOF

echo "✅ Created .env.local with Hardhat test account"
echo ""
echo "📝 Next steps:"
echo "   1. Start Hardhat node: npx hardhat node"
echo "   2. Deploy contract:    npx hardhat run scripts/deploy-production.ts --network localhost"
echo "   3. The contract address will be automatically saved to .env"
echo ""
echo "⚠️  Note: This uses Hardhat's PUBLIC test private key."
echo "    Never use this key on real networks!"
