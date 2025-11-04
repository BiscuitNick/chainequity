# ChainEquity - Product Requirements Document

## Executive Summary

**Project Name:** ChainEquity  
**Version:** 1.0  
**Purpose:** Tokenized security prototype demonstrating blockchain-based cap-table management with compliance gating, corporate actions, and operator workflows.

**Key Deliverable:** A working prototype showing how tokenized securities function on-chain with:
- Transfer restrictions via allowlist
- Automated compliance checks
- Corporate action execution (stock splits, symbol changes)
- Real-time cap-table generation
- Operator management interface

---

## Technical Stack

### Blockchain & Infrastructure
- **Network:** Polygon Amoy Testnet (Chain ID: 80002)
- **RPC Provider:** Alchemy (Free tier - 300M compute units/month)
- **Block Explorer:** Polygonscan Amoy

### Smart Contracts
- **Language:** Solidity 0.8.20+
- **Framework:** Hardhat
- **Libraries:** OpenZeppelin Contracts v5.0+
- **Testing:** Hardhat, Chai, Waffle
- **Deployment:** Hardhat Ignition

### Backend Services
- **Runtime:** Node.js 18+ / TypeScript 5+
- **Web3 Library:** Alchemy SDK v3
- **Database:** SQLite (better-sqlite3)
- **API Framework:** Express.js
- **Environment:** dotenv

### Frontend (Optional Dashboard)
- **Framework:** Next.js 15 (App Router)
- **UI Library:** shadcn/ui + Tailwind CSS
- **Web3 Integration:** Alchemy SDK + wagmi/viem
- **State Management:** React hooks + Context API

### CLI Tool
- **Framework:** Commander.js
- **Styling:** Chalk for colored output
- **Tables:** cli-table3 for formatted output

### Development Tools
- **Package Manager:** pnpm (faster than npm)
- **Code Quality:** ESLint + Prettier
- **Git Hooks:** Husky (optional)
- **CI/CD:** GitHub Actions (optional)

---

## Project Structure

```
chainequity/
├── contracts/
│   ├── ChainEquityToken.sol          # Main ERC-20 with allowlist gating
│   ├── interfaces/
│   │   └── IChainEquityToken.sol     # Interface definition
│   └── mocks/
│       └── MockToken.sol             # For testing
│
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── issuer.service.ts     # Wallet approval & token minting
│   │   │   ├── indexer.service.ts    # Event listening & processing
│   │   │   ├── captable.service.ts   # Cap-table generation & queries
│   │   │   └── corporate.service.ts  # Corporate actions execution
│   │   ├── db/
│   │   │   ├── database.ts           # SQLite connection & setup
│   │   │   └── schema.sql            # Database schema
│   │   ├── api/
│   │   │   ├── routes.ts             # Express routes
│   │   │   └── controllers/
│   │   ├── config/
│   │   │   └── alchemy.config.ts     # Alchemy SDK setup
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   ├── server.ts                      # Express server entry
│   └── package.json
│
├── cli/
│   ├── commands/
│   │   ├── approve.ts                 # Approve wallet command
│   │   ├── mint.ts                    # Mint tokens command
│   │   ├── transfer.ts                # Transfer command
│   │   ├── split.ts                   # Execute stock split
│   │   ├── symbol.ts                  # Change symbol
│   │   └── captable.ts                # Export cap-table
│   ├── utils/
│   │   ├── display.ts                 # Formatting helpers
│   │   └── validation.ts              # Input validation
│   └── index.ts                       # CLI entry point
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Dashboard home
│   │   ├── approve/
│   │   │   └── page.tsx               # Wallet approval UI
│   │   ├── mint/
│   │   │   └── page.tsx               # Token minting UI
│   │   ├── captable/
│   │   │   └── page.tsx               # Cap-table viewer
│   │   └── corporate/
│   │       └── page.tsx               # Corporate actions UI
│   ├── components/
│   │   ├── ui/                        # shadcn components
│   │   ├── WalletConnect.tsx          # Wallet connection
│   │   ├── ApprovalForm.tsx
│   │   ├── MintForm.tsx
│   │   ├── CapTableView.tsx
│   │   └── CorporateActions.tsx
│   ├── lib/
│   │   ├── alchemy.ts                 # Alchemy client
│   │   └── utils.ts
│   └── package.json
│
├── scripts/
│   ├── deploy.ts                      # Contract deployment
│   ├── verify.ts                      # Polygonscan verification
│   ├── demo-flow.ts                   # Automated demo script
│   └── setup-local.ts                 # Local network setup
│
├── test/
│   ├── unit/
│   │   └── ChainEquityToken.test.ts   # Contract unit tests
│   ├── integration/
│   │   ├── issuer.test.ts
│   │   ├── indexer.test.ts
│   │   └── corporate-actions.test.ts
│   └── fixtures/
│       └── testData.ts
│
├── docs/
│   ├── ARCHITECTURE.md                # Technical architecture
│   ├── DECISIONS.md                   # Decision log
│   ├── API.md                         # Backend API docs
│   └── GAS_REPORT.md                  # Gas benchmarks
│
├── .env.example
├── .gitignore
├── hardhat.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── DISCLAIMER.md                      # Regulatory disclaimer
```

---

## Core Components

### 1. ChainEquityToken Smart Contract

**File:** `contracts/ChainEquityToken.sol`

**Inheritance:**
```solidity
contract ChainEquityToken is ERC20, Ownable
```

**State Variables:**
```solidity
// Allowlist management
mapping(address => bool) public allowlist;

// Corporate actions
uint256 public splitMultiplier = 1;  // Default 1:1, increases with splits
string private _symbol;              // Mutable symbol
string private _name;                // Mutable name

// Admin controls
address public admin;
```

**Key Functions:**

```solidity
// Allowlist Management
function approveWallet(address wallet) external onlyOwner
function revokeWallet(address wallet) external onlyOwner
function isApproved(address wallet) external view returns (bool)

// Token Operations (gated)
function mint(address to, uint256 amount) external onlyOwner
function transfer(address to, uint256 amount) public override returns (bool)
function transferFrom(address from, address to, uint256 amount) public override returns (bool)

// Corporate Actions
function executeSplit(uint256 multiplier) external onlyOwner
function updateSymbol(string memory newSymbol) external onlyOwner

// View Functions (accounting for splits)
function balanceOf(address account) public view override returns (uint256)
function totalSupply() public view override returns (uint256)
function actualBalance(address account) public view returns (uint256) // Raw balance
```

**Events:**
```solidity
event WalletApproved(address indexed wallet, uint256 timestamp);
event WalletRevoked(address indexed wallet, uint256 timestamp);
event StockSplit(uint256 oldMultiplier, uint256 newMultiplier, uint256 timestamp);
event SymbolChanged(string oldSymbol, string newSymbol, uint256 timestamp);
event TransferBlocked(address indexed from, address indexed to, uint256 amount, string reason);
```

**Transfer Logic:**
```solidity
function _update(address from, address to, uint256 value) internal override {
    // Allow minting (from == address(0))
    if (from == address(0)) {
        super._update(from, to, value);
        return;
    }
    
    // Check both parties are approved
    require(allowlist[from], "Sender not approved");
    require(allowlist[to], "Recipient not approved");
    
    super._update(from, to, value);
}
```

**Stock Split Implementation:**
```solidity
// Virtual split - no balance iteration needed
function executeSplit(uint256 multiplier) external onlyOwner {
    require(multiplier > 1, "Multiplier must be > 1");
    
    uint256 oldMultiplier = splitMultiplier;
    splitMultiplier = splitMultiplier * multiplier;
    
    emit StockSplit(oldMultiplier, splitMultiplier, block.timestamp);
}

// Balance accounting for splits
function balanceOf(address account) public view override returns (uint256) {
    return super.balanceOf(account) * splitMultiplier;
}

function totalSupply() public view override returns (uint256) {
    return super.totalSupply() * splitMultiplier;
}
```

---

### 2. Issuer Service

**File:** `backend/src/services/issuer.service.ts`

**Responsibilities:**
- Manage wallet approvals/revocations
- Mint tokens to approved wallets
- Query allowlist status
- Submit transactions to blockchain

**Key Methods:**

```typescript
class IssuerService {
  private alchemy: Alchemy;
  private contract: Contract;
  private signer: Wallet;

  // Wallet approval
  async approveWallet(address: string): Promise<TransactionReceipt>
  async revokeWallet(address: string): Promise<TransactionReceipt>
  async isWalletApproved(address: string): Promise<boolean>
  async getApprovedWallets(): Promise<string[]>

  // Token minting
  async mintTokens(to: string, amount: bigint): Promise<TransactionReceipt>
  
  // Corporate actions
  async executeSplit(multiplier: number): Promise<TransactionReceipt>
  async updateSymbol(newSymbol: string): Promise<TransactionReceipt>
  
  // Utilities
  async getTransactionStatus(txHash: string): Promise<TransactionStatus>
  async estimateGas(operation: string, params: any[]): Promise<bigint>
}
```

**Example Usage:**
```typescript
const issuer = new IssuerService();

// Approve wallet
await issuer.approveWallet("0x1234...");

// Mint tokens
await issuer.mintTokens("0x1234...", parseUnits("1000", 18));

// Execute 7-for-1 split
await issuer.executeSplit(7);
```

---

### 3. Event Indexer

**File:** `backend/src/services/indexer.service.ts`

**Responsibilities:**
- Listen to blockchain events via Alchemy WebSocket
- Process Transfer, Mint, Burn, Approval events
- Store event data in SQLite
- Generate cap-table snapshots

**Database Schema:**

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'Transfer', 'WalletApproved', etc.
  from_address TEXT,
  to_address TEXT,
  amount TEXT,
  data JSON,
  timestamp INTEGER NOT NULL,
  indexed_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_block_number ON events(block_number);
CREATE INDEX idx_event_type ON events(event_type);
CREATE INDEX idx_addresses ON events(from_address, to_address);

CREATE TABLE IF NOT EXISTS balances (
  address TEXT PRIMARY KEY,
  balance TEXT NOT NULL,
  last_updated_block INTEGER NOT NULL,
  last_updated_timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS corporate_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL, -- 'Split', 'SymbolChange'
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  timestamp INTEGER NOT NULL
);
```

**Key Methods:**

```typescript
class IndexerService {
  private alchemy: Alchemy;
  private db: Database;
  private wsProvider: WebSocketProvider;

  // Event listening
  async startListening(): Promise<void>
  async stopListening(): Promise<void>
  private async handleTransfer(event: Log): Promise<void>
  private async handleApproval(event: Log): Promise<void>
  private async handleSplit(event: Log): Promise<void>
  
  // Balance tracking
  async updateBalance(address: string, block: number): Promise<void>
  async getCurrentBalance(address: string): Promise<bigint>
  async getBalanceAtBlock(address: string, block: number): Promise<bigint>
  
  // Historical queries
  async getEventsInRange(startBlock: number, endBlock: number): Promise<Event[]>
  async reindexFromBlock(block: number): Promise<void>
}
```

**Event Processing Flow:**
```typescript
// Listen to all contract events
contract.on("*", async (event) => {
  switch(event.eventName) {
    case "Transfer":
      await handleTransfer(event);
      break;
    case "WalletApproved":
      await handleApproval(event);
      break;
    case "StockSplit":
      await handleSplit(event);
      break;
  }
});
```

---

### 4. Cap-Table Service

**File:** `backend/src/services/captable.service.ts`

**Responsibilities:**
- Generate cap-table snapshots from indexed data
- Support historical queries ("as-of block")
- Export to CSV/JSON formats
- Calculate ownership percentages

**Key Methods:**

```typescript
class CapTableService {
  private db: Database;
  private contract: Contract;

  // Cap-table generation
  async generateCapTable(blockNumber?: number): Promise<CapTableEntry[]>
  async getHolderCount(): Promise<number>
  async getTotalSupply(blockNumber?: number): Promise<bigint>
  
  // Export formats
  async exportToCSV(blockNumber?: number): Promise<string>
  async exportToJSON(blockNumber?: number): Promise<string>
  
  // Analytics
  async getOwnershipDistribution(): Promise<DistributionData>
  async getTopHolders(limit: number): Promise<CapTableEntry[]>
}
```

**CapTableEntry Interface:**
```typescript
interface CapTableEntry {
  address: string;
  balance: bigint;
  balanceFormatted: string;  // Human-readable (e.g., "1,000.00")
  ownershipPercent: number;  // e.g., 25.5
  lastUpdatedBlock: number;
  lastUpdatedTimestamp: number;
}
```

**Export Example:**
```csv
Address,Balance,Ownership %,Last Updated Block
0x1234...5678,10000.00,50.00%,12345678
0xabcd...ef01,7000.00,35.00%,12345679
0x9876...4321,3000.00,15.00%,12345680
```

---

### 5. CLI Tool

**File:** `cli/index.ts`

**Commands:**

```bash
# Wallet Management
chainequity approve <address>              # Approve wallet
chainequity revoke <address>               # Revoke wallet approval
chainequity status <address>               # Check approval status
chainequity list-approved                  # List all approved wallets

# Token Operations
chainequity mint <address> <amount>        # Mint tokens
chainequity transfer <to> <amount>         # Transfer tokens
chainequity balance <address>              # Check balance

# Corporate Actions
chainequity split <multiplier>             # Execute stock split
chainequity symbol <new-symbol>            # Change token symbol

# Cap-Table
chainequity captable                       # Export current cap-table
chainequity captable --block 12345678      # Historical cap-table
chainequity captable --format csv          # Export as CSV
chainequity captable --format json         # Export as JSON

# Utilities
chainequity deploy                         # Deploy contract
chainequity verify                         # Verify on Polygonscan
chainequity demo                           # Run demo flow
```

**Implementation Example:**

```typescript
// cli/commands/approve.ts
import { Command } from 'commander';
import { IssuerService } from '../../backend/src/services/issuer.service';
import chalk from 'chalk';

export const approveCommand = new Command('approve')
  .description('Approve a wallet for token transfers')
  .argument('<address>', 'Wallet address to approve')
  .action(async (address: string) => {
    try {
      console.log(chalk.blue(`Approving wallet: ${address}...`));
      
      const issuer = new IssuerService();
      const receipt = await issuer.approveWallet(address);
      
      console.log(chalk.green('✓ Wallet approved!'));
      console.log(chalk.gray(`  Transaction: ${receipt.hash}`));
      console.log(chalk.gray(`  Block: ${receipt.blockNumber}`));
      console.log(chalk.gray(`  Gas used: ${receipt.gasUsed.toString()}`));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error.message);
      process.exit(1);
    }
  });
```

---

### 6. Next.js Dashboard

**File:** `frontend/app/page.tsx`

**Pages:**

1. **Dashboard Home** (`/`)
   - Overview stats (total supply, holder count, split multiplier)
   - Recent transactions
   - Quick actions

2. **Wallet Approval** (`/approve`)
   - Form to approve/revoke wallets
   - List of approved wallets with status
   - Bulk approval upload (CSV)

3. **Token Minting** (`/mint`)
   - Form to mint tokens to approved wallets
   - Validation (recipient must be approved)
   - Transaction history

4. **Cap-Table Viewer** (`/captable`)
   - Interactive table with sorting/filtering
   - Ownership pie chart
   - Export buttons (CSV/JSON)
   - Historical view with block number selector

5. **Corporate Actions** (`/corporate`)
   - Stock split form (multiplier input)
   - Symbol change form
   - History of corporate actions
   - Impact preview before execution

**Key Components:**

```typescript
// components/ApprovalForm.tsx
'use client';

import { useState } from 'react';
import { useAlchemy } from '@/lib/alchemy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ApprovalForm() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const alchemy = useAlchemy();

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Call backend API or direct contract interaction
      const response = await fetch('/api/approve', {
        method: 'POST',
        body: JSON.stringify({ address }),
      });
      // Handle success
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input 
        placeholder="0x..." 
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Button onClick={handleApprove} disabled={loading}>
        {loading ? 'Approving...' : 'Approve Wallet'}
      </Button>
    </div>
  );
}
```

```typescript
// components/CapTableView.tsx
'use client';

import { useEffect, useState } from 'react';
import { Table } from '@/components/ui/table';

interface CapTableEntry {
  address: string;
  balance: string;
  ownershipPercent: number;
}

export function CapTableView() {
  const [capTable, setCapTable] = useState<CapTableEntry[]>([]);

  useEffect(() => {
    fetch('/api/captable')
      .then(res => res.json())
      .then(data => setCapTable(data));
  }, []);

  return (
    <Table>
      <thead>
        <tr>
          <th>Address</th>
          <th>Balance</th>
          <th>Ownership %</th>
        </tr>
      </thead>
      <tbody>
        {capTable.map(entry => (
          <tr key={entry.address}>
            <td>{entry.address}</td>
            <td>{entry.balance}</td>
            <td>{entry.ownershipPercent.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
```

---

## Configuration & Environment

### Environment Variables

**`.env.example`:**
```bash
# Alchemy Configuration
ALCHEMY_API_KEY=your_api_key_here
ALCHEMY_NETWORK=polygon-amoy

# Deployment
DEPLOYER_PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=0x...  # Set after deployment

# Polygonscan Verification
POLYGONSCAN_API_KEY=your_polygonscan_key_here

# Backend API
PORT=3001
DATABASE_PATH=./data/chainequity.db

# Frontend
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ALCHEMY_API_KEY=your_api_key_here
NEXT_PUBLIC_CHAIN_ID=80002
```

### Hardhat Configuration

**`hardhat.config.ts`:**
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    amoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.DEPLOYER_PRIVATE_KEY 
        ? [process.env.DEPLOYER_PRIVATE_KEY] 
        : [],
      chainId: 80002,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "docs/GAS_REPORT.md",
    noColors: true,
  },
};

export default config;
```

---

## Testing Requirements

### Unit Tests (Contracts)

**File:** `test/unit/ChainEquityToken.test.ts`

**Test Cases:**

```typescript
describe("ChainEquityToken", function () {
  // Setup
  describe("Deployment", () => {
    it("Should set the correct name and symbol");
    it("Should set the deployer as owner");
    it("Should initialize splitMultiplier to 1");
  });

  // Allowlist Management
  describe("Allowlist", () => {
    it("Should allow owner to approve wallet");
    it("Should allow owner to revoke wallet");
    it("Should emit WalletApproved event");
    it("Should emit WalletRevoked event");
    it("Should prevent non-owner from approving");
    it("Should return correct approval status");
  });

  // Token Operations
  describe("Minting", () => {
    it("Should allow owner to mint to approved wallet");
    it("Should prevent minting to non-approved wallet");
    it("Should prevent non-owner from minting");
    it("Should update balance correctly");
  });

  describe("Transfers", () => {
    it("Should allow transfer between two approved wallets");
    it("Should block transfer to non-approved wallet");
    it("Should block transfer from non-approved wallet");
    it("Should emit Transfer event on success");
    it("Should emit TransferBlocked event on failure");
    it("Should allow transferFrom with proper allowance");
  });

  // Corporate Actions
  describe("Stock Split", () => {
    it("Should execute 7-for-1 split correctly");
    it("Should update splitMultiplier");
    it("Should multiply all balances");
    it("Should maintain ownership percentages");
    it("Should emit StockSplit event");
    it("Should prevent non-owner from splitting");
    it("Should handle multiple splits (7x then 2x)");
  });

  describe("Symbol Change", () => {
    it("Should update symbol correctly");
    it("Should preserve all balances");
    it("Should emit SymbolChanged event");
    it("Should prevent non-owner from changing");
  });

  // Edge Cases
  describe("Edge Cases", () => {
    it("Should handle zero balance correctly");
    it("Should handle maximum uint256 balance");
    it("Should prevent split with multiplier < 2");
    it("Should handle self-transfer for approved wallet");
  });
});
```

### Integration Tests

**File:** `test/integration/issuer.test.ts`

```typescript
describe("Issuer Service Integration", () => {
  it("Should approve wallet and mint tokens end-to-end");
  it("Should prevent transfer before approval");
  it("Should execute corporate action and update indexer");
  it("Should handle transaction failures gracefully");
});
```

**File:** `test/integration/indexer.test.ts`

```typescript
describe("Event Indexer Integration", () => {
  it("Should capture Transfer events in real-time");
  it("Should update balance table correctly");
  it("Should generate accurate cap-table");
  it("Should handle blockchain reorganizations");
  it("Should support historical queries");
});
```

---

## Gas Benchmarks

**Target Gas Costs (Polygon Amoy):**

| Operation | Target Gas | Notes |
|-----------|-----------|-------|
| Approve wallet | < 50k | Add to allowlist mapping |
| Revoke wallet | < 50k | Remove from allowlist |
| Mint tokens | < 100k | Transfer from zero address |
| Transfer (gated) | < 100k | With allowlist checks |
| Execute split | < 50k | Update splitMultiplier only |
| Change symbol | < 50k | Update string storage |

**Measurement:**
```bash
npx hardhat test --gas-reporter
```

**Gas Optimization Strategies:**
- Use `uint256` instead of smaller types (no packing benefit)
- Cache storage reads in memory
- Use events instead of storing historical data on-chain
- Minimize SLOAD operations
- Use `calldata` instead of `memory` for external function params

---

## API Endpoints (Backend)

**Base URL:** `http://localhost:3001/api`

### Issuer Endpoints

```
POST   /issuer/approve
POST   /issuer/revoke
GET    /issuer/status/:address
GET    /issuer/approved
POST   /issuer/mint
```

### Corporate Actions

```
POST   /corporate/split
POST   /corporate/symbol
GET    /corporate/history
```

### Cap-Table

```
GET    /captable
GET    /captable/:blockNumber
GET    /captable/export?format=csv
GET    /captable/export?format=json
```

### Analytics

```
GET    /analytics/holders
GET    /analytics/supply
GET    /analytics/distribution
```

**Example Request:**
```typescript
// POST /issuer/approve
{
  "address": "0x1234567890123456789012345678901234567890"
}

// Response
{
  "success": true,
  "transactionHash": "0xabc...",
  "blockNumber": 12345678,
  "gasUsed": "45231"
}
```

---

## Deployment Process

### Step 1: Setup Environment

```bash
# Clone repository
git clone <repo-url>
cd chainequity

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your Alchemy API key and private key
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

### Step 3: Run Tests

```bash
# Unit tests
npx hardhat test

# With gas reporter
npx hardhat test --gas-reporter

# Coverage
npx hardhat coverage
```

### Step 4: Deploy to Local Network

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy.ts --network localhost
```

### Step 5: Deploy to Polygon Amoy

```bash
# Deploy
npx hardhat run scripts/deploy.ts --network amoy

# Verify on Polygonscan
npx hardhat verify --network amoy <CONTRACT_ADDRESS> "ChainEquity" "CEQ"
```

### Step 6: Start Backend Services

```bash
# Start indexer
cd backend
pnpm run start:indexer

# Start API server
pnpm run start:server
```

### Step 7: Start Frontend (Optional)

```bash
cd frontend
pnpm run dev
```

### Step 8: Run Demo

```bash
# Using CLI
chainequity demo

# Or run demo script
npx hardhat run scripts/demo-flow.ts --network amoy
```

---

## Demo Flow Script

**File:** `scripts/demo-flow.ts`

```typescript
async function runDemo() {
  console.log("=== ChainEquity Demo ===\n");

  const issuer = new IssuerService();
  const captable = new CapTableService();

  // 1. Deploy contract (if not already deployed)
  console.log("1. Deploying contract...");
  // ... deployment logic

  // 2. Approve wallets
  console.log("\n2. Approving wallets...");
  await issuer.approveWallet(WALLET_A);
  await issuer.approveWallet(WALLET_B);
  console.log("✓ Wallets approved");

  // 3. Mint tokens
  console.log("\n3. Minting tokens...");
  await issuer.mintTokens(WALLET_A, parseUnits("10000", 18));
  await issuer.mintTokens(WALLET_B, parseUnits("5000", 18));
  console.log("✓ Tokens minted");

  // 4. Attempt transfer to non-approved wallet (should fail)
  console.log("\n4. Testing transfer to non-approved wallet...");
  try {
    await contract.connect(walletA).transfer(WALLET_C, parseUnits("100", 18));
    console.log("✗ Transfer should have failed!");
  } catch (error) {
    console.log("✓ Transfer blocked as expected");
  }

  // 5. Approve third wallet and retry
  console.log("\n5. Approving third wallet and retrying...");
  await issuer.approveWallet(WALLET_C);
  await contract.connect(walletA).transfer(WALLET_C, parseUnits("100", 18));
  console.log("✓ Transfer succeeded");

  // 6. Export cap-table before split
  console.log("\n6. Cap-table before split:");
  const capTableBefore = await captable.generateCapTable();
  console.table(capTableBefore);

  // 7. Execute 7-for-1 split
  console.log("\n7. Executing 7-for-1 stock split...");
  await issuer.executeSplit(7);
  console.log("✓ Split executed");

  // 8. Export cap-table after split
  console.log("\n8. Cap-table after split:");
  const capTableAfter = await captable.generateCapTable();
  console.table(capTableAfter);

  // 9. Change symbol
  console.log("\n9. Changing symbol from CEQ to CEQX...");
  await issuer.updateSymbol("CEQX");
  console.log("✓ Symbol changed");

  // 10. Export final cap-table
  console.log("\n10. Final cap-table export:");
  const csv = await captable.exportToCSV();
  console.log(csv);

  console.log("\n=== Demo Complete ===");
}
```

---

## Documentation Deliverables

### 1. README.md

Structure:
```markdown
# ChainEquity

## Overview
Brief description of the project

## Features
- Gated token transfers
- Allowlist-based compliance
- Stock splits via virtual multiplier
- Symbol changes
- Real-time cap-table generation

## Tech Stack
List all technologies

## Setup
Step-by-step installation

## Usage
### CLI
Command examples

### Dashboard
How to use the web interface

### API
Endpoint documentation

## Testing
How to run tests

## Deployment
Deployment instructions

## Architecture
High-level overview with diagrams

## Disclaimer
Regulatory compliance warning
```

### 2. ARCHITECTURE.md

Contents:
- System architecture diagram
- Smart contract design
- Backend service architecture
- Event indexing flow
- Cap-table generation algorithm
- Corporate actions implementation
- Security considerations

### 3. DECISIONS.md

Decision log format:
```markdown
## Decision: Stock Split Implementation

**Date:** 2024-XX-XX
**Context:** Need to implement 7-for-1 stock split
**Options Considered:**
1. Iterate through holders and update balances
2. Deploy new contract and migrate
3. Virtual split with multiplier

**Decision:** Option 3 (virtual split)

**Rationale:**
- Minimal gas cost (single storage update)
- No holder iteration needed
- Maintains proportional ownership
- Scales to unlimited holders

**Tradeoffs:**
- Adds complexity to balance queries
- Requires careful handling in frontend
- Historical queries need multiplier context

**Implementation:**
- Store splitMultiplier in contract
- Override balanceOf() to multiply by splitMultiplier
- Update totalSupply() similarly
```

### 4. GAS_REPORT.md

Generated from Hardhat gas reporter:
```markdown
# Gas Usage Report

## Summary
Total gas used: X
Average gas per transaction: Y

## Detailed Breakdown

| Operation | Gas Used | USD Cost (Polygon) |
|-----------|----------|-------------------|
| Approve wallet | 45,231 | $0.0001 |
| Mint tokens | 87,456 | $0.0002 |
| Transfer | 65,789 | $0.0002 |
| Execute split | 42,123 | $0.0001 |
| Change symbol | 38,456 | $0.0001 |

## Optimization Opportunities
List potential gas savings
```

---

## Security Considerations

### Smart Contract Security

1. **Access Control**
   - Only owner can approve/revoke wallets
   - Only owner can mint tokens
   - Only owner can execute corporate actions
   - Consider multi-sig for production

2. **Transfer Validation**
   - Both sender and recipient must be approved
   - Prevent zero-address transfers
   - Validate amount > 0

3. **Integer Overflow/Underflow**
   - Solidity 0.8+ has built-in checks
   - Still validate split multipliers

4. **Reentrancy**
   - Not applicable (no external calls in transfer)
   - But use CEI pattern anyway

5. **Front-Running**
   - Allowlist changes are admin-only
   - Minimal front-running risk

### Backend Security

1. **Private Key Management**
   - Never commit private keys
   - Use environment variables
   - Consider hardware wallet for production

2. **API Security**
   - Rate limiting on endpoints
   - Input validation
   - CORS configuration

3. **Database Security**
   - SQLite file permissions
   - Prepared statements (SQL injection prevention)
   - Regular backups

---

## Known Limitations & Risks

### Technical Limitations

1. **Allowlist Management**
   - Manual approval process (no automated KYC)
   - Admin must approve each wallet individually
   - No bulk approval mechanism (could be added)

2. **Stock Split Implementation**
   - Virtual split adds query complexity
   - Historical cap-table exports need context
   - Frontend must handle multiplier correctly

3. **Event Indexing**
   - Requires continuous backend process
   - Potential for missed events if service down
   - Reindexing needed after gaps

4. **Scalability**
   - SQLite suitable for prototype only
   - Would need PostgreSQL for production
   - WebSocket connection management at scale

### Regulatory Disclaimer

**CRITICAL:** Include this in all documentation:

```
DISCLAIMER: This is a technical prototype for educational purposes only.
It does NOT comply with securities regulations and should NEVER be used
for real securities without:
- Legal review
- Regulatory approval
- Proper KYC/AML implementation
- Accredited investor verification
- Securities law compliance

This system demonstrates technical mechanics only and makes no claims
about regulatory compliance.
```

---

## Success Criteria

### Functional Requirements

| Requirement | Test | Status |
|-------------|------|--------|
| Approve wallet | Can add to allowlist | ☐ |
| Revoke wallet | Can remove from allowlist | ☐ |
| Mint to approved | Tokens created for approved wallet | ☐ |
| Mint to non-approved | Transaction reverts | ☐ |
| Transfer (both approved) | Transfer succeeds | ☐ |
| Transfer (sender not approved) | Transfer reverts | ☐ |
| Transfer (recipient not approved) | Transfer reverts | ☐ |
| Execute 7-for-1 split | All balances multiply by 7 | ☐ |
| Split preserves ownership % | Percentages unchanged | ☐ |
| Change symbol | Symbol updates, balances same | ☐ |
| Export cap-table | CSV/JSON generated | ☐ |
| Historical cap-table | Query at specific block | ☐ |

### Performance Requirements

| Metric | Target | Actual |
|--------|--------|--------|
| Transfer confirmation time | < 5 seconds | |
| Cap-table generation | < 10 seconds | |
| Indexer event processing | < 1 second | |
| API response time | < 500ms | |

### Gas Requirements

| Operation | Target | Actual |
|-----------|--------|--------|
| Approve wallet | < 50k | |
| Mint tokens | < 100k | |
| Transfer | < 100k | |
| Split | < 50k | |
| Symbol change | < 50k | |

---

## Development Phases

### Phase 1: Foundation (Week 1)
- ✅ Setup project structure
- ✅ Configure Hardhat with Alchemy
- ✅ Write ChainEquityToken contract
- ✅ Write unit tests
- ✅ Deploy to local network

### Phase 2: Backend Services (Week 2)
- ⬜ Build IssuerService
- ⬜ Build IndexerService
- ⬜ Setup SQLite database
- ⬜ Build CapTableService
- ⬜ Write integration tests

### Phase 3: CLI Tool (Week 2-3)
- ⬜ Implement all CLI commands
- ⬜ Add colored output
- ⬜ Add input validation
- ⬜ Write demo script

### Phase 4: Frontend (Week 3-4)
- ⬜ Setup Next.js 15 project
- ⬜ Build approval page
- ⬜ Build minting page
- ⬜ Build cap-table viewer
- ⬜ Build corporate actions page

### Phase 5: Testing & Documentation (Week 4)
- ⬜ Comprehensive test suite
- ⬜ Gas benchmarks
- ⬜ Technical writeup
- ⬜ Decision log
- ⬜ API documentation

### Phase 6: Deployment (Week 4)
- ⬜ Deploy to Polygon Amoy
- ⬜ Verify contract on Polygonscan
- ⬜ Run full demo
- ⬜ Create demo video

---

## Optional Hard-Mode Features

*If you finish core requirements and want extra challenge:*

### Multi-Sig Admin Controls
- Require N-of-M signatures for sensitive operations
- Implement using Gnosis Safe or custom contract
- Add UI for proposal/approval workflow

### Vesting Schedules
- Time-locked token releases
- Cliff + linear vesting
- Transfer restrictions until vested

### Partial Transfer Restrictions
- Max daily volume per wallet
- Cooling-off periods
- Whitelist specific amounts

### Dividend Distribution
- Proportional token distribution
- Snapshot-based claims
- Unclaimed dividend handling

### On-Chain Governance
- Token-weighted voting
- Parameter change proposals
- Execution after quorum

---

## Key Dependencies

### Contracts
```json
{
  "@openzeppelin/contracts": "^5.0.0",
  "hardhat": "^2.19.0",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0"
}
```

### Backend
```json
{
  "alchemy-sdk": "^3.0.0",
  "express": "^4.18.0",
  "better-sqlite3": "^9.0.0",
  "dotenv": "^16.3.0",
  "typescript": "^5.3.0"
}
```

### CLI
```json
{
  "commander": "^11.0.0",
  "chalk": "^5.3.0",
  "cli-table3": "^0.6.3",
  "inquirer": "^9.2.0"
}
```

### Frontend
```json
{
  "next": "^15.0.0",
  "react": "^18.0.0",
  "alchemy-sdk": "^3.0.0",
  "wagmi": "^2.0.0",
  "viem": "^2.0.0",
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3.4.0"
}
```

---

## Getting Started Checklist

Before you start coding:

- [ ] Create Alchemy account and get API key
- [ ] Get testnet MATIC from faucet
- [ ] Setup MetaMask with Polygon Amoy
- [ ] Create new wallet for deployment (testnet only!)
- [ ] Setup GitHub repository
- [ ] Install all dependencies
- [ ] Verify Hardhat can compile example contract
- [ ] Test Alchemy connection

---

## Alchemy Setup Instructions

### 1. Create Alchemy Account
1. Go to https://www.alchemy.com
2. Sign up for free account
3. Verify email

### 2. Create App
1. Click "Create new app"
2. Select:
   - Chain: Polygon
   - Network: Polygon Amoy
   - Name: ChainEquity
3. Click "Create app"

### 3. Get API Keys
1. Click on your app
2. Go to "API Keys" tab
3. Copy:
   - API Key
   - HTTP URL
   - WebSocket URL

### 4. Configure Environment
```bash
# Add to .env
ALCHEMY_API_KEY=your_key_here
```

### 5. Test Connection
```typescript
import { Alchemy, Network } from "alchemy-sdk";

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.MATIC_AMOY,
});

// Test
const blockNumber = await alchemy.core.getBlockNumber();
console.log("Connected! Current block:", blockNumber);
```

---

## Polygon Amoy Faucet

### Getting Testnet MATIC

**Option 1: Alchemy Faucet**
1. Go to https://www.alchemy.com/faucets/polygon-amoy
2. Connect wallet
3. Request 0.5 MATIC
4. Wait ~30 seconds

**Option 2: Polygon Faucet**
1. Go to https://faucet.polygon.technology/
2. Select "Polygon Amoy"
3. Enter wallet address
4. Complete CAPTCHA
5. Request tokens

**Note:** You need a small amount of testnet MATIC to:
- Deploy contracts (~0.01 MATIC)
- Execute transactions (~0.001 MATIC each)
- Run comprehensive tests (~0.1 MATIC)

---

## Quick Start Commands

```bash
# Initialize project
pnpm create chainequity
cd chainequity
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your keys

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy locally
npx hardhat node  # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost  # Terminal 2

# Deploy to Amoy
npx hardhat run scripts/deploy.ts --network amoy

# Verify contract
npx hardhat verify --network amoy <ADDRESS> "ChainEquity" "CEQ"

# Start backend
cd backend && pnpm start

# Start frontend
cd frontend && pnpm dev

# Run CLI
chainequity --help
```

---

## Project Timeline Estimate

**Total Estimated Time:** 4-6 weeks (part-time)

- **Week 1:** Smart contracts + tests (15-20 hours)
- **Week 2:** Backend services + indexer (15-20 hours)
- **Week 3:** CLI tool + integration tests (10-15 hours)
- **Week 4:** Frontend dashboard (15-20 hours)
- **Week 5:** Testing + documentation (10-15 hours)
- **Week 6:** Deployment + demo (5-10 hours)

**Full-time:** Could be completed in 2-3 weeks

---

## Support Resources

### Documentation
- **Hardhat:** https://hardhat.org/docs
- **OpenZeppelin:** https://docs.openzeppelin.com/contracts
- **Alchemy SDK:** https://docs.alchemy.com/docs/alchemy-sdk-quickstart
- **Polygon:** https://docs.polygon.technology/
- **Next.js 15:** https://nextjs.org/docs

### Faucets
- **Alchemy Faucet:** https://www.alchemy.com/faucets/polygon-amoy
- **Polygon Faucet:** https://faucet.polygon.technology/

### Block Explorers
- **Polygonscan Amoy:** https://amoy.polygonscan.com

### Community
- **Hardhat Discord:** https://hardhat.org/discord
- **OpenZeppelin Forum:** https://forum.openzeppelin.com/
- **Alchemy Discord:** https://www.alchemy.com/discord

---

## Final Notes

This PRD serves as your complete technical specification. Key principles:

1. **Start Simple:** Get core features working before adding complexity
2. **Test Everything:** Write tests as you go, not at the end
3. **Document Decisions:** Keep DECISIONS.md updated
4. **Iterate Fast:** Use local network for rapid development
5. **Deploy Early:** Test on Amoy frequently to catch issues

Remember: This is a **technical prototype** demonstrating blockchain mechanics, not a production-ready securities platform. Focus on clean code, good architecture, and clear documentation.

**Good luck building! 🚀**
