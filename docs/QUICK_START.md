# ChainEquity - Quick Start Guide

## What We Built So Far ✅

1. **Smart Contract** - ChainEquityToken.sol (ERC-20 with allowlist + stock splits)
2. **Backend Server** - Express + SQLite + Alchemy SDK
3. **Database** - Event tracking and balance management

## Test Locally (No API Keys!)

**Terminal 1:**
```bash
npx hardhat node
```

**Terminal 2:**
```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

This deploys the token, mints tokens, and tests all features!

## Test Backend Server

```bash
cd backend
npm run dev
# Then: curl http://localhost:3000/health
```

## Project Status

- ✅ Tasks 1-3 complete (25%)
- 📋 Next: Task 4 (Issuer Service)
- 📁 Full details: See `PROJECT_SUMMARY.md`

## Key Files

- `contracts/ChainEquityToken.sol` - Token contract
- `backend/src/server.ts` - Express server
- `backend/src/db/schema.sql` - Database
- `hardhat.config.ts` - Network config
- `.env` - Add your API keys here (optional for local testing)

## Next Steps

1. Review `PROJECT_SUMMARY.md` for complete details
2. Run local tests above
3. Continue with Task 4 (Issuer Service) or deploy to testnet

**Task Master:**
```bash
task-master next  # See what's next
```
