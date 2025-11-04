# ChainEquity

**ERC-20 Tokenized Securities with Virtual Stock Splits**

ChainEquity is a production-ready smart contract system for tokenizing securities on Ethereum-compatible blockchains. It implements an ERC-20 compliant token with advanced features including virtual stock splits, wallet allowlisting, and comprehensive event tracking.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-3.0-yellow.svg)](https://hardhat.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Gas Efficiency](#gas-efficiency)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Functionality

- **ERC-20 Compliance**: Fully compatible with the ERC-20 token standard
- **Virtual Stock Splits**: Execute stock splits without rebalancing all holder accounts
- **Wallet Allowlist**: Restrict token transfers to approved wallets only
- **Metadata Management**: Update token name and symbol post-deployment
- **Event Tracking**: Comprehensive event emission for all state changes
- **Gas Optimized**: 14-25% more efficient than standard ERC-20 implementations

### Virtual Stock Split Mechanism

Traditional stock splits require iterating through all token holders to update balances, which becomes prohibitively expensive at scale. ChainEquity implements a **virtual split mechanism**:

- **Constant Gas Cost**: Stock splits cost ~30k gas regardless of holder count
- **Automatic Calculation**: Balances are computed on-the-fly using a split multiplier
- **Split History**: All corporate actions are tracked in the database
- **Forward & Reverse**: Supports both forward splits (2:1, 5:1) and reverse splits (1:2)

### Technology Stack

**Smart Contracts:**
- Solidity 0.8.20 with optimizer enabled
- OpenZeppelin contracts for security
- Custom virtual split implementation

**Backend:**
- TypeScript with Node.js
- Express.js REST API
- SQLite database with better-sqlite3
- Alchemy SDK for blockchain indexing

**Testing & Development:**
- Hardhat 3.0 with Viem
- Node.js native test runner
- Comprehensive unit and integration tests
- Gas benchmarking tools

---

## Architecture

ChainEquity consists of three main components:

```
┌─────────────────────┐
│  Smart Contract     │
│  (ChainEquityToken) │
└──────────┬──────────┘
           │
           │ Events
           ↓
┌─────────────────────┐
│  Event Listener     │
│  (Alchemy SDK)      │
└──────────┬──────────┘
           │
           │ Database Writes
           ↓
┌─────────────────────┐
│  SQLite Database    │
│  (Events, Balances) │
└──────────┬──────────┘
           │
           │ Read Operations
           ↓
┌─────────────────────┐
│  REST API           │
│  (Express.js)       │
└─────────────────────┘
```

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- An Ethereum wallet with testnet funds (for deployment)
- Alchemy API key (for event indexing)

### Quick Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/chainequity.git
cd chainequity

# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run tests
npm test

# Start local Hardhat node
npx hardhat node

# Deploy contract (in another terminal)
npx hardhat run scripts/deploy-local.ts --network localhost

# Start backend server
cd backend && npm start
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chainequity.git
cd chainequity
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Blockchain Configuration
ALCHEMY_API_KEY=your_alchemy_api_key
DEPLOYER_PRIVATE_KEY=0x...

# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-key

# Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Optional: Gas Reporter
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_cmc_api_key
```

Create a `.env` file in the `backend` directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/chainequity.db

# Blockchain
ALCHEMY_API_KEY=your_alchemy_api_key
CHAIN_ID=80002
TOKEN_ADDRESS=0x...
START_BLOCK=0

# API Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Configuration

### Hardhat Configuration

The `hardhat.config.ts` file includes:

- **Solidity Compiler**: Version 0.8.20 with optimizer (200 runs)
- **Networks**: Localhost, Sepolia, Polygon Amoy
- **Gas Reporter**: Configurable gas consumption reporting
- **Etherscan Verification**: Automatic contract verification

### Network Configuration

#### Local Development

```bash
# Start Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy-local.ts --network localhost
```

#### Testnet Deployment (Polygon Amoy)

```bash
# Ensure you have testnet MATIC
# Update .env with DEPLOYER_PRIVATE_KEY

npx hardhat run scripts/deploy.ts --network polygonAmoy
```

#### Mainnet Deployment

```bash
# ⚠️ CAUTION: Real funds required
# Review all configurations
# Test thoroughly on testnet first

npx hardhat run scripts/deploy-production.ts --network mainnet
```

---

## Usage

### Smart Contract Interactions

#### Deploy Contract

```typescript
import { viem } from "hardhat";

const token = await viem.deployContract("ChainEquityToken", [
  "My Company Stock",  // Token name
  "MCS",              // Token symbol
  ownerAddress        // Owner address
]);
```

#### Approve Wallet

```typescript
// Only owner can approve wallets
await token.write.approveWallet([walletAddress]);
```

#### Mint Tokens

```typescript
// Only owner can mint
await token.write.mint([
  recipientAddress,
  parseEther("1000")  // Amount in wei
]);
```

#### Transfer Tokens

```typescript
// Both sender and receiver must be approved
await token.write.transfer([
  recipientAddress,
  parseEther("100")
]);
```

#### Execute Stock Split

```typescript
// 2:1 forward split
await token.write.executeSplit([20000n]);  // 20000 basis points = 2.0x

// 1:2 reverse split
await token.write.executeSplit([5000n]);   // 5000 basis points = 0.5x
```

#### Check Balance

```typescript
const balance = await token.read.balanceOf([address]);
const formatted = formatEther(balance);
console.log(`Balance: ${formatted} tokens`);
```

### Backend API Usage

#### Start the Server

```bash
cd backend
npm start
```

#### API Endpoints

**Get Cap Table**
```bash
curl http://localhost:3000/api/captable
```

**Get Holder Information**
```bash
curl http://localhost:3000/api/captable/holder/0x123...
```

**Get Analytics**
```bash
curl http://localhost:3000/api/analytics/overview
```

**Get Corporate Actions**
```bash
curl http://localhost:3000/api/corporate/history
```

For complete API documentation, see [API.md](API.md).

---

## Development

### Project Structure

```
chainequity/
├── contracts/              # Smart contracts
│   └── ChainEquityToken.sol
├── test/                   # Contract tests
│   └── ChainEquityToken.ts
├── scripts/                # Deployment and utility scripts
│   ├── deploy.ts
│   ├── deploy-local.ts
│   ├── gas-benchmark.ts
│   └── verify.ts
├── backend/                # Backend server
│   ├── src/
│   │   ├── api/           # API routes
│   │   ├── db/            # Database layer
│   │   ├── services/      # Business logic
│   │   └── server.ts      # Express app
│   └── __tests__/         # Integration tests
├── hardhat.config.ts       # Hardhat configuration
└── package.json
```

### Development Workflow

1. **Write Smart Contract Code**
   ```bash
   # Edit contracts/ChainEquityToken.sol
   npm run lint:sol
   ```

2. **Run Tests**
   ```bash
   npm test                    # All tests
   npm test -- --grep "Stock"  # Specific tests
   ```

3. **Check Gas Usage**
   ```bash
   npx hardhat run scripts/gas-benchmark.ts
   ```

4. **Deploy Locally**
   ```bash
   npx hardhat node
   npx hardhat run scripts/deploy-local.ts --network localhost
   ```

5. **Start Backend**
   ```bash
   cd backend
   npm run dev  # Development mode with hot reload
   ```

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Lint Solidity
npm run lint:sol

# Fix linting issues
npm run lint:fix
npm run lint:sol:fix

# Run all tests
npm test
cd backend && npm test && cd ..
```

---

## Testing

### Smart Contract Tests

```bash
# Run all contract tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test file
npx hardhat test test/ChainEquityToken.ts

# Run specific test
npm test -- --grep "should execute stock split"
```

**Test Coverage:**
- ✅ Deployment and initialization
- ✅ Wallet approval and revocation
- ✅ Token minting
- ✅ Transfers (approved wallets only)
- ✅ Stock splits (forward and reverse)
- ✅ Metadata updates (name and symbol)
- ✅ Access control
- ✅ Error cases and reverts

### Backend Integration Tests

```bash
cd backend
npm test

# Run specific test suite
npm test -- analytics.test.ts

# Verbose output
npm test -- --verbose
```

**Test Coverage:**
- ✅ Cap table API endpoints
- ✅ Analytics endpoints
- ✅ Corporate actions API
- ✅ Database operations
- ✅ Service layer logic
- ✅ Error handling

### Gas Benchmarking

```bash
npx hardhat run scripts/gas-benchmark.ts
```

This generates a detailed gas report showing:
- Gas consumption for each operation
- Min/avg/max values
- Comparison with ERC-20 standards
- Gas target compliance

See [GAS_REPORT.md](GAS_REPORT.md) for detailed results.

---

## Deployment

### Local Deployment

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy-local.ts --network localhost

# Terminal 3: Start backend
cd backend
npm run dev
```

### Testnet Deployment (Polygon Amoy)

```bash
# 1. Get testnet MATIC from faucet
# https://faucet.polygon.technology/

# 2. Configure environment
# Edit .env with DEPLOYER_PRIVATE_KEY and ALCHEMY_API_KEY

# 3. Deploy contract
npx hardhat run scripts/deploy.ts --network polygonAmoy

# 4. Verify contract
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS> "Token Name" "SYMBOL" <OWNER_ADDRESS>

# 5. Initialize database
npx ts-node scripts/init-database.ts

# 6. Start backend
cd backend
npm start
```

### Production Deployment

⚠️ **Production deployment requires careful planning and review.**

**Pre-deployment Checklist:**
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Legal compliance reviewed
- [ ] Deployment scripts tested on testnet
- [ ] Backup and recovery plan in place
- [ ] Multisig wallet configured for ownership
- [ ] Documentation complete

```bash
# Deploy to mainnet
npx hardhat run scripts/deploy-production.ts --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> ...

# Transfer ownership to multisig
npx hardhat run scripts/transfer-ownership.ts --network mainnet
```

---

## API Documentation

### REST API Endpoints

The backend server exposes the following endpoints:

#### Cap Table

- `GET /api/captable` - Get full cap table
- `GET /api/captable/summary` - Get summary statistics
- `GET /api/captable/holders` - Get list of token holders
- `GET /api/captable/holder/:address` - Get specific holder info
- `GET /api/captable/top/:limit` - Get top N holders
- `GET /api/captable/export?format=csv` - Export cap table

#### Analytics

- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/holders` - Get holder statistics
- `GET /api/analytics/supply` - Get supply metrics
- `GET /api/analytics/distribution` - Get distribution analysis
- `GET /api/analytics/events` - Get recent events

#### Corporate Actions

- `GET /api/corporate/history` - Get corporate action history
- `GET /api/corporate/splits` - Get stock split history
- `GET /api/corporate/symbols` - Get symbol changes
- `GET /api/corporate/names` - Get name changes

For detailed API documentation with request/response examples, see [API.md](API.md).

---

## Gas Efficiency

ChainEquity is optimized for gas efficiency:

| Operation | Gas Cost | vs Standard ERC-20 |
|-----------|----------|-------------------|
| Transfer (existing holder) | 39,041 | -25% |
| Transfer (new holder) | 56,153 | -23% |
| Mint (existing) | 38,850 | -19% |
| Mint (new) | 73,050 | -14% |
| Stock Split | 30,246 | N/A (constant) |

**Key Advantages:**
- ✅ All transfers stay well below 100k gas target
- ✅ Stock splits have constant cost (independent of holder count)
- ✅ 14-25% more efficient than standard ERC-20

For detailed gas analysis, see [GAS_REPORT.md](GAS_REPORT.md).

---

## Security

### Smart Contract Security

**Best Practices Implemented:**
- ✅ OpenZeppelin battle-tested contracts
- ✅ Access control with Ownable
- ✅ Reentrancy protection
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Input validation on all functions
- ✅ Event emission for all state changes

**Security Considerations:**
- Wallet allowlist prevents unauthorized transfers
- Owner has significant control (minting, splits, approvals)
- Consider using multisig for ownership in production
- Regular security audits recommended before mainnet deployment

### Backend Security

- Rate limiting on API endpoints
- Input validation and sanitization
- Helmet.js for HTTP security headers
- CORS configuration
- Error handling without information leakage

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Write Tests** for new functionality
4. **Ensure Tests Pass** (`npm test`)
5. **Lint Your Code** (`npm run lint`)
6. **Commit Changes** (`git commit -m 'Add amazing feature'`)
7. **Push to Branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Write comprehensive tests
- Update documentation
- Keep commits atomic and well-described
- Ensure no linting errors

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

⚠️ **IMPORTANT LEGAL NOTICE**

This software is provided for educational and demonstration purposes. Tokenized securities are subject to securities regulations in most jurisdictions. Before deploying this system in production:

- Consult with legal counsel
- Ensure compliance with applicable securities laws
- Obtain necessary licenses and registrations
- Implement proper KYC/AML procedures
- Consider regulatory requirements in all target jurisdictions

See [DISCLAIMER.md](DISCLAIMER.md) for complete legal information.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/chainequity/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/chainequity/discussions)

---

## Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [Hardhat](https://hardhat.org/) for development environment
- [Viem](https://viem.sh/) for Ethereum interactions
- [Alchemy](https://alchemy.com/) for blockchain infrastructure

---

**Built with ❤️ for the future of tokenized securities**
