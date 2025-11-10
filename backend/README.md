# ChainEquity Backend

Express.js backend server for ChainEquity with REST API, event indexing, and database management.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server
npm start

# Development mode (hot reload)
npm run dev
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Configuration

Create a `.env` file in this directory:

```bash
PORT=4000
NODE_ENV=development
DATABASE_PATH=./data/chainequity.db
ALCHEMY_API_KEY=your_key_here
CHAIN_ID=80002
TOKEN_CONTRACT_ADDRESS=0x...
START_BLOCK=0
```

## Available Scripts

- `npm run build` - Build TypeScript to dist/
- `npm start` - Run production server
- `npm run dev` - Development server with hot reload
- `npm run dev:indexer` - Run indexer in dev mode
- `npm run watch-indexer` - Watch mode for indexer
- `npm test` - Run Jest tests
- `npm run test:coverage` - Run tests with coverage

## API Endpoints

See the main [README.md](../README.md#api-reference) for complete API documentation.

## Architecture

- **Express.js** - REST API server
- **Better-SQLite3** - Database
- **Alchemy SDK** - Blockchain connection
- **TypeScript** - Type safety

## Documentation

For complete documentation, see the main [README.md](../README.md) in the project root.
