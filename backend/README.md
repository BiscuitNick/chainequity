# ChainEquity Backend

Backend services for the ChainEquity tokenized securities platform.

## Services

### API Server
Express-based REST API for querying blockchain data.

```bash
npm run dev        # Development mode with auto-reload
npm start          # Production mode
```

### Event Indexer
Monitors blockchain events and synchronizes them to the local database.

```bash
npm run dev:indexer    # Development mode with auto-reload
```

### Auto-Indexer (Local Development)
**New!** Automatically indexes blockchain events in real-time for local development.

The auto-indexer watches for new blocks on your local Hardhat node and automatically syncs events to the database. This eliminates the need to manually run the indexer after every transaction during development.

#### Features
- Real-time block monitoring via WebSocket
- Automatic event synchronization
- Debounced processing (400ms) to handle rapid transactions
- Automatic reconnection with exponential backoff
- Minimal logging - only shows activity when events are processed
- Local development only (localhost guard for safety)

#### Usage

**Prerequisites:**
1. Start your local Hardhat node:
   ```bash
   npx hardhat node
   ```

2. Deploy your contract and set environment variables:
   ```bash
   # .env file
   USE_LOCAL_NETWORK=true
   LOCAL_RPC_URL=http://127.0.0.1:8545
   TOKEN_CONTRACT_ADDRESS=0x...
   ```

**Start the auto-indexer:**

From the backend directory:
```bash
npm run watch-indexer
```

Or from the project root:
```bash
npm run watch-indexer
```

**Output example:**
```
🎯 ChainEquity Auto-Indexer Watcher
============================================================
Environment: development
Network: Local Hardhat
RPC URL: http://127.0.0.1:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
============================================================

🤖 Starting Auto-Indexer for Local Development
============================================================
WebSocket URL: ws://127.0.0.1:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Debounce: 400ms
============================================================
📡 Connecting to local node...
✅ Connected to network: unknown (chainId: 31337)
✅ Block listener configured
✅ Auto-indexer started successfully
👀 Watching for new blocks...

🎧 Auto-indexer is now watching for new blocks...
💡 Mine transactions on your local network to see events indexed automatically
Press Ctrl+C to stop
```

When transactions occur:
```
📦 Block 15 | Synced 3 blocks | 2 events | 245ms
📦 Block 16 | Synced 1 block | 1 events | 89ms
```

#### How It Works

1. **WebSocket Connection**: Connects to `ws://127.0.0.1:8545` and subscribes to new block events
2. **Debouncing**: Waits 400ms after receiving a block event before syncing (handles rapid transaction bursts)
3. **Smart Syncing**: Reads `last_synced_block` from database and syncs from there to current block
4. **Event Processing**: Uses the existing `IndexerService.syncHistoricalEvents()` method to process events
5. **Database Updates**: Stores events and updates balances in the local SQLite database

#### Configuration

Environment variables:
- `USE_LOCAL_NETWORK=true` - **Required** to enable auto-indexer
- `LOCAL_RPC_URL` - WebSocket/HTTP URL for local node (default: `http://127.0.0.1:8545`)
- `TOKEN_CONTRACT_ADDRESS` - Address of deployed ChainEquityToken contract

#### Reconnection Behavior

If the WebSocket connection is lost, the auto-indexer will automatically attempt to reconnect with exponential backoff:
- Attempt 1: 1 second delay
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Attempts 4+: 8 seconds delay (max)
- Max attempts: 10

After 10 failed attempts, the service stops and requires manual restart.

#### Graceful Shutdown

Press `Ctrl+C` to stop the auto-indexer. It will:
1. Stop accepting new block events
2. Clear any pending debounce timers
3. Close the WebSocket connection
4. Exit cleanly

#### Development Workflow

**Recommended setup** - Run in separate terminal windows:

Terminal 1 - Hardhat node:
```bash
npx hardhat node
```

Terminal 2 - Auto-indexer:
```bash
npm run watch-indexer
```

Terminal 3 - Backend API server:
```bash
npm run dev
```

Terminal 4 - Frontend (if applicable):
```bash
cd frontend && npm run dev
```

Now when you interact with the blockchain (deploy contracts, mint tokens, transfer, etc.), the auto-indexer will automatically sync events to the database and your frontend will show updated data immediately!

#### Troubleshooting

**Auto-indexer won't start:**
- Verify `USE_LOCAL_NETWORK=true` in `.env`
- Verify `TOKEN_CONTRACT_ADDRESS` is set
- Ensure Hardhat node is running on `http://127.0.0.1:8545`

**No events being indexed:**
- Check that the contract address is correct
- Verify transactions are actually being mined
- Check the database file exists: `backend/data/chainequity.db`

**WebSocket connection issues:**
- Hardhat's built-in node supports WebSocket on the same port as HTTP
- The auto-indexer automatically converts `http://` URLs to `ws://`
- If using a custom provider, ensure WebSocket support is enabled

**Events processing slowly:**
- Default debounce is 400ms - adjust if needed in `autoIndexer.service.ts`
- Database writes are synchronous - consider optimizing if processing many events

## Database

SQLite database stored at `backend/data/chainequity.db`

Schema includes:
- `events` - All blockchain events (transfers, minting, etc.)
- `balances` - Token balances by address
- `corporate_actions` - Stock splits, symbol changes, etc.
- `metadata` - System metadata (last synced block, contract info, etc.)

## Environment Variables

```bash
# Server
PORT=4000
NODE_ENV=development

# Network Configuration
USE_LOCAL_NETWORK=true              # Use local Hardhat node
LOCAL_RPC_URL=http://127.0.0.1:8545 # Local RPC endpoint

# Alchemy (for testnet/mainnet)
ALCHEMY_API_KEY=your_key_here
ALCHEMY_NETWORK=polygon-amoy

# Contract
TOKEN_CONTRACT_ADDRESS=0x...        # Deployed contract address

# Database
DATABASE_PATH=./data/chainequity.db
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Build

```bash
npm run build         # Compile TypeScript to dist/
```

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Express API server
│   ├── indexer-runner.ts      # Manual indexer CLI
│   ├── watch-indexer.ts       # Auto-indexer CLI (new!)
│   ├── services/
│   │   ├── indexer.service.ts      # Event indexing logic
│   │   └── autoIndexer.service.ts  # Auto-indexer service (new!)
│   ├── db/
│   │   ├── database.ts        # SQLite wrapper
│   │   └── schema.sql         # Database schema
│   ├── config/
│   │   └── env.ts             # Environment configuration
│   └── routes/
│       └── api.routes.ts      # API endpoints
├── data/
│   └── chainequity.db         # SQLite database
└── dist/                      # Compiled JavaScript
```
