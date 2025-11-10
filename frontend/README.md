# ChainEquity Frontend

Next.js frontend application for ChainEquity token management.

## Quick Start

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

Access at: `http://localhost:3050`

## Configuration

Create a `.env.local` file in this directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key_here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Available Scripts

- `npm run dev` - Start development server (port 3050)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features

- **Dashboard** - Token metrics and analytics
- **Cap Table** - Real-time cap table with CSV export
- **Transfer Interface** - Transfer tokens between wallets
- **Mint Interface** - Mint new tokens (owner only)
- **Wallet Management** - Approve/revoke wallets
- **Corporate Actions** - Execute splits, update metadata
- **Event History** - Complete audit trail
- **Analytics** - Charts and distribution metrics

## Technology Stack

- **Next.js 16** with App Router
- **React 19** - UI library
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **RainbowKit** - Wallet connection
- **Wagmi** - Contract interactions
- **React Query** - Data fetching

## Documentation

For complete documentation, see the main [README.md](../README.md#frontend-application) in the project root.
