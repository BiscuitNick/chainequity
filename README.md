# ChainEquity

**ERC-20 Tokenized Securities with Virtual Stock Splits & Event Indexing**

ChainEquity is a production-ready smart contract system for tokenizing securities on Ethereum-compatible blockchains. It implements an ERC-20 compliant token with advanced features including virtual stock splits, wallet allowlisting, comprehensive event tracking, and a full-stack application with blockchain indexing.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-3.0-yellow.svg)](https://hardhat.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Testing](#testing)
- [CLI Usage](#cli-usage)
- [Frontend Application](#frontend-application)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Gas Efficiency](#gas-efficiency)
- [Security](#security)
- [Contributing](#contributing)

---

## Features

### Core Functionality

- ✅ **ERC-20 Compliance**: Fully compatible with the ERC-20 token standard
- ✅ **Virtual Stock Splits**: Execute stock splits without rebalancing all holder accounts (~30k gas)
- ✅ **Wallet Allowlist**: Restrict token transfers to approved wallets only
- ✅ **Metadata Management**: Update token name and symbol post-deployment
- ✅ **Event Tracking**: Comprehensive event emission and blockchain indexing
- ✅ **Gas Optimized**: 14-25% more efficient than standard ERC-20 implementations
- ✅ **Full-Stack Application**: React frontend, Express backend, real-time indexing
- ✅ **Cap Table Management**: Real-time cap table with CSV export
- ✅ **Corporate Actions Tracking**: Complete audit trail of splits, name/symbol changes
- ✅ **RESTful API**: Comprehensive API for analytics, events, and cap table data
- ✅ **Docker Support**: One-command deployment with Docker Compose

### Virtual Stock Split Mechanism

Traditional stock splits require iterating through all token holders to update balances, which becomes prohibitively expensive at scale. ChainEquity implements a **virtual split mechanism**:

- **Constant Gas Cost**: Stock splits cost ~30k gas regardless of holder count
- **Automatic Calculation**: Balances are computed on-the-fly using a split multiplier
- **Split History**: All corporate actions are tracked in the database
- **Forward & Reverse**: Supports both forward splits (2:1, 7:1) and reverse splits (1:2)

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
- Real-time event listener

**Frontend:**
- Next.js 16 with React 19
- TailwindCSS + shadcn/ui components
- RainbowKit for wallet connection
- Wagmi for contract interactions
- React Query for data fetching

**Testing & Development:**
- Hardhat 3.0 with Viem
- Node.js native test runner
- Jest for backend integration tests
- Comprehensive unit and integration tests (61 passing)
- Gas benchmarking tools

---

## Quick Start

### Prerequisites

**Option 1: Docker (Recommended - Fastest)**
- Docker Desktop installed
- Git

**Option 2: Local Development**
- Node.js 20+ and npm
- Git
- Alchemy API key (for event indexing)

### Quick Start with Docker 🐳

The fastest way to get ChainEquity running:

```bash
# Clone the repository
git clone https://github.com/yourusername/chainequity.git
cd chainequity

# Start all services (Hardhat + Backend + Frontend + Indexer)
docker-compose -f docker-compose.full.yml up

# Access the application
# Frontend:    http://localhost:3050
# API:         http://localhost:4000
# Blockchain:  http://localhost:8545
```

**That's it!** Docker will:
- ✅ Start a local Hardhat blockchain
- ✅ Deploy the ChainEquityToken contract
- ✅ Initialize the database
- ✅ Start the backend API server
- ✅ Start the event indexer
- ✅ Start the Next.js frontend

**Connect MetaMask:**
```
Network Name: ChainEquity Local
RPC URL:      http://localhost:8545
Chain ID:     31337
Currency:     ETH

Test Account Private Key (10,000 ETH):
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Stop all services:**
```bash
docker-compose -f docker-compose.full.yml down
```

**Fresh start (clear all data):**
```bash
docker-compose -f docker-compose.full.yml down -v
docker-compose -f docker-compose.full.yml up
```

---

## Installation

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/chainequity.git
cd chainequity

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Install frontend dependencies
cd frontend && npm install && cd ..

# 5. Set up environment variables (see Configuration section)
cp .env.example .env
# Edit .env with your keys

# 6. Run tests to verify setup
npm test
cd backend && npm test && cd ..
```

---

## Configuration

### Environment Variables

**Root `.env` file** (Smart contracts & deployment):

```bash
# Blockchain Configuration
ALCHEMY_API_KEY=your_alchemy_api_key_here
DEPLOYER_PRIVATE_KEY=0xyour_private_key_here

# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/your-key

# Contract Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Optional: Gas Reporter
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_cmc_api_key
```

**Backend `.env` file** (backend directory):

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
DATABASE_PATH=./data/chainequity.db

# Blockchain Connection
ALCHEMY_API_KEY=your_alchemy_api_key_here
CHAIN_ID=80002                    # Polygon Amoy testnet
TOKEN_CONTRACT_ADDRESS=0x...      # Deployed contract address
START_BLOCK=0                     # Block to start indexing from

# API Configuration
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend `.env.local` file** (frontend directory):

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Alchemy API Key (for frontend RPC)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# WalletConnect Project ID (optional, for WalletConnect)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Getting API Keys

1. **Alchemy API Key** (Required for indexing):
   - Sign up at [alchemy.com](https://alchemy.com)
   - Create a new app for your target network
   - Copy the API key

2. **Etherscan/Polygonscan API Key** (Required for contract verification):
   - Sign up at [etherscan.io](https://etherscan.io) or [polygonscan.com](https://polygonscan.com)
   - Navigate to API Keys section
   - Generate a new key

3. **WalletConnect Project ID** (Optional, for wallet connections):
   - Sign up at [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Create a new project
   - Copy the Project ID

---

## Testing

### Smart Contract Tests

```bash
# Run all contract tests (61 tests)
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test file
npx hardhat test test/ChainEquityToken.ts

# Run specific test
npm test -- --grep "should execute stock split"
```

**Test Coverage (61 passing tests):**
- ✅ Deployment and initialization
- ✅ Wallet approval and revocation (including idempotency)
- ✅ Token minting and burning
- ✅ Transfer events with exact argument validation
- ✅ Approval events with edge cases (zero, max, overwrite)
- ✅ Stock splits (forward, reverse, compounding)
- ✅ Symbol and name changes with validation
- ✅ TransferBlocked event behavior on reverts
- ✅ Access control and permissions
- ✅ Event coverage for all operations
- ✅ Non-existent events validation

### Backend Integration Tests

```bash
cd backend

# Run all backend tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- analytics.test.ts

# Watch mode
npm run test:watch
```

**Backend Test Coverage:**
- ✅ Cap table API endpoints
- ✅ Analytics endpoints
- ✅ Corporate actions API
- ✅ Event tracking and indexing
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

See [docs/GAS_REPORT.md](docs/GAS_REPORT.md) for detailed results.

### Running All Tests

```bash
# From project root
npm test && npm --prefix backend test
```

---

## CLI Usage

ChainEquity includes a powerful CLI for token management operations.

### Available Commands

```bash
# Get help
npx tsx cli.ts --help

# Approve wallet
npx tsx cli.ts approve <address>

# Revoke wallet
npx tsx cli.ts revoke <address>

# Mint tokens
npx tsx cli.ts mint <address> <amount>

# View cap table
npx tsx cli.ts captable

# Execute stock split
npx tsx cli.ts split <multiplier>

# Update symbol
npx tsx cli.ts update-symbol <new-symbol>

# Update name
npx tsx cli.ts update-name <new-name>

# View contract info
npx tsx cli.ts info
```

### CLI Examples

```bash
# Approve a wallet for token transfers
npx tsx cli.ts approve 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Mint 10,000 tokens to an approved wallet
npx tsx cli.ts mint 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 10000

# Execute a 7-for-1 stock split
npx tsx cli.ts split 70000

# View current cap table
npx tsx cli.ts captable

# Update token symbol
npx tsx cli.ts update-symbol CEQX
```

### CLI in Docker

```bash
# Execute CLI commands inside the Docker container
docker exec -it chainequity-api npx tsx cli.ts --help
docker exec -it chainequity-api npx tsx cli.ts captable
docker exec -it chainequity-api npx tsx cli.ts mint <address> <amount>
```

**Note:** CLI operations require the `DEPLOYER_PRIVATE_KEY` in your `.env` file.

For detailed CLI documentation, see [docs/CLI_GUIDE.md](docs/CLI_GUIDE.md).

---

## Frontend Application

### Starting the Frontend

```bash
# Development mode (with hot reload)
cd frontend
npm run dev

# Production build
npm run build
npm start
```

Access at: `http://localhost:3050`

### Features

- **Dashboard**: Overview of token metrics, recent events, and analytics
- **Cap Table**: Real-time cap table with search, sort, and CSV export
- **Transfer Tokens**: Interface for transferring tokens between approved wallets
- **Mint Tokens**: Token minting interface (owner only)
- **Approve Wallets**: Manage wallet allowlist (owner only)
- **Corporate Actions**: Execute stock splits, update symbol/name
- **Event History**: Complete audit trail of all blockchain events
- **Analytics**: Charts and metrics for token distribution and activity

### Wallet Connection

The frontend uses RainbowKit for wallet connections:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow
- And more...

### Frontend Configuration

Required environment variables in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
```

---

## API Reference

The backend exposes a comprehensive RESTful API.

### Core Endpoints

#### Health Check
```bash
GET /health
```

#### Cap Table
```bash
GET /api/captable              # Full cap table
GET /api/captable/summary      # Summary statistics
GET /api/captable/holders      # List of holders
GET /api/captable/holder/:address  # Specific holder info
GET /api/captable/top/:limit   # Top N holders
GET /api/captable/export?format=csv  # CSV export
```

#### Analytics
```bash
GET /api/analytics/overview     # Analytics overview
GET /api/analytics/holders      # Holder statistics
GET /api/analytics/supply       # Supply metrics
GET /api/analytics/distribution # Distribution analysis
GET /api/analytics/events       # Recent events
```

#### Events
```bash
GET /api/events                 # All events with pagination
GET /api/events/transfers       # Transfer events only
GET /api/events/wallet-approvals  # Approval events
GET /api/events/corporate       # Corporate action events
GET /api/events/address/:address  # Events for specific address
```

#### Corporate Actions
```bash
GET /api/corporate/history      # Corporate action history
GET /api/corporate/splits       # Stock split history
GET /api/corporate/symbols      # Symbol changes
GET /api/corporate/names        # Name changes
```

#### Issuer Operations
```bash
GET /api/issuer/approved        # List approved wallets
POST /api/issuer/approve        # Approve wallet
POST /api/issuer/revoke         # Revoke wallet
POST /api/issuer/mint           # Mint tokens
```

### API Examples

```bash
# Get cap table
curl http://localhost:4000/api/captable

# Get holder info
curl http://localhost:4000/api/captable/holder/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Get recent events
curl http://localhost:4000/api/events?limit=10

# Export cap table as CSV
curl http://localhost:4000/api/captable/export?format=csv > captable.csv
```

For complete API documentation with request/response examples, see [docs/API.md](docs/API.md).

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
npm run build
npm start

# Terminal 4: Start frontend
cd frontend
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
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS> \
  "Token Name" "SYMBOL" <OWNER_ADDRESS>

# 5. Update backend .env with contract address

# 6. Start backend
cd backend
npm run build
npm start

# 7. Start frontend
cd frontend
npm run build
npm start
```

### Docker Deployment

See [Quick Start](#quick-start-with-docker-) section above for Docker deployment instructions.

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

See [docs/DISCLAIMER.md](docs/DISCLAIMER.md) for legal considerations.

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                  │
│                   http://localhost:3050                 │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP Requests
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Express)                  │
│                   http://localhost:4000                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  REST API Routes                                │   │
│  │  - /api/captable  - /api/analytics             │   │
│  │  - /api/events    - /api/corporate             │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │ Database Queries
                        ↓
┌─────────────────────────────────────────────────────────┐
│              SQLite Database (Better-SQLite3)           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tables:                                        │   │
│  │  - events         - balances                    │   │
│  │  - corporate_actions - metadata                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────▲─────────────────────────────▲─────────────┘
              │                             │
              │ Write Events                │ Read Contract State
              │                             │
┌─────────────┴────────────┐    ┌──────────┴──────────────┐
│   Event Listener         │    │   RPC Queries           │
│   (Alchemy WebSocket)    │    │   (Alchemy SDK)         │
└─────────────┬────────────┘    └──────────┬──────────────┘
              │                             │
              │ Subscribe to Events         │ Contract Calls
              │                             │
              └──────────────┬──────────────┘
                             ↓
              ┌──────────────────────────────┐
              │   Blockchain Network         │
              │   (Ethereum/Polygon)         │
              │  ┌────────────────────────┐  │
              │  │  ChainEquityToken      │  │
              │  │  Smart Contract        │  │
              │  └────────────────────────┘  │
              └──────────────────────────────┘
```

### Components

1. **Smart Contract (ChainEquityToken.sol)**
   - ERC-20 compliant token
   - Virtual stock split mechanism
   - Wallet allowlist enforcement
   - Event emission for all state changes

2. **Event Listener (Backend)**
   - Real-time WebSocket connection to blockchain
   - Listens for all contract events
   - Indexes events into SQLite database
   - Maintains balance snapshots

3. **Database Layer (SQLite)**
   - Events table with full event history
   - Balances table for current state
   - Corporate actions table
   - Optimized indexes for fast queries

4. **REST API (Express)**
   - Serves frontend and external clients
   - Rate limiting and security headers
   - CORS configuration
   - Comprehensive error handling

5. **Frontend (Next.js)**
   - Modern React UI with shadcn/ui
   - Wallet connection with RainbowKit
   - Real-time data with React Query
   - Responsive design with TailwindCSS

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Gas Efficiency

ChainEquity is optimized for gas efficiency:

| Operation | Gas Cost | vs Standard ERC-20 | Target |
|-----------|----------|-------------------|--------|
| Transfer (existing holder) | 39,041 | -25% | < 100k ✅ |
| Transfer (new holder) | 56,153 | -23% | < 100k ✅ |
| Mint (existing) | 38,850 | -19% | < 100k ✅ |
| Mint (new) | 73,050 | -14% | < 100k ✅ |
| Stock Split | 30,246 | N/A (constant) | < 100k ✅ |
| Approve Wallet | 44,100 | N/A | < 100k ✅ |

**Key Advantages:**
- ✅ All operations stay well below 100k gas target
- ✅ Stock splits have constant cost (independent of holder count)
- ✅ 14-25% more efficient than standard ERC-20
- ✅ No iteration over token holders needed

For detailed gas analysis and benchmarks, see [docs/GAS_REPORT.md](docs/GAS_REPORT.md).

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
- ✅ Comprehensive test coverage (61 tests)

**Security Considerations:**
- Wallet allowlist prevents unauthorized transfers
- Owner has significant control (minting, splits, approvals)
- Consider using multisig for ownership in production
- Regular security audits recommended before mainnet deployment

### Backend Security

- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization
- ✅ Helmet.js for HTTP security headers
- ✅ CORS configuration
- ✅ Error handling without information leakage
- ✅ Environment variable protection
- ✅ Database prepared statements (SQL injection prevention)

### Best Practices

1. **Never commit private keys or API keys**
2. **Use environment variables for sensitive data**
3. **Test thoroughly on testnet before mainnet**
4. **Consider multisig wallets for contract ownership**
5. **Regular security audits**
6. **Monitor contract events in production**

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

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Lint Solidity
npm run lint:sol

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run all quality checks
npm run quality
```

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

See [docs/DISCLAIMER.md](docs/DISCLAIMER.md) for complete legal information.

---

## Documentation

- **API Reference**: [docs/API.md](docs/API.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **CLI Guide**: [docs/CLI_GUIDE.md](docs/CLI_GUIDE.md)
- **Gas Report**: [docs/GAS_REPORT.md](docs/GAS_REPORT.md)
- **Testing Guide**: [docs/TESTING.md](docs/TESTING.md)
- **Legal Disclaimer**: [docs/DISCLAIMER.md](docs/DISCLAIMER.md)

---

## Troubleshooting

### Common Issues

**Database conflicts after Hardhat restart:**
```bash
# Clear database
rm -rf backend/data/chainequity.db*

# Or use the reset script
./scripts/reset-db-only.sh
```

**Port already in use:**
```bash
# Change ports in .env files or docker-compose.yml
```

**Tests failing:**
```bash
# Ensure Hardhat node is not running
pkill -f "hardhat node"

# Run tests
npm test
```

**Docker issues:**
```bash
# Fresh start
docker-compose -f docker-compose.full.yml down -v
docker-compose -f docker-compose.full.yml up --build
```

---

## Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [Hardhat](https://hardhat.org/) for development environment
- [Viem](https://viem.sh/) for Ethereum interactions
- [Alchemy](https://alchemy.com/) for blockchain infrastructure
- [Next.js](https://nextjs.org/) for the frontend framework
- [shadcn/ui](https://ui.shadcn.com/) for UI components

---

**Built with ❤️ for the future of tokenized securities**
