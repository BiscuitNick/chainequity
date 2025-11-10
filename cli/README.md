# ChainEquity CLI

Command-line interface for ChainEquity token management operations.

## Usage

```bash
# From project root
npx tsx cli.ts --help

# Approve wallet
npx tsx cli.ts approve <address>

# Mint tokens
npx tsx cli.ts mint <address> <amount>

# View cap table
npx tsx cli.ts captable

# Execute stock split
npx tsx cli.ts split <multiplier>
```

## Available Commands

- `approve <address>` - Approve wallet for token transfers
- `revoke <address>` - Revoke wallet approval
- `mint <address> <amount>` - Mint tokens to approved wallet
- `captable` - Display current cap table
- `split <multiplier>` - Execute stock split (basis points)
- `update-symbol <symbol>` - Update token symbol
- `update-name <name>` - Update token name
- `info` - Display contract information

## Configuration

Requires `DEPLOYER_PRIVATE_KEY` in root `.env` file:

```bash
DEPLOYER_PRIVATE_KEY=0xyour_private_key
TOKEN_CONTRACT_ADDRESS=0x...
ALCHEMY_API_KEY=your_key
```

## Examples

```bash
# Approve a wallet
npx tsx cli.ts approve 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Mint 10,000 tokens
npx tsx cli.ts mint 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 10000

# Execute 7-for-1 split
npx tsx cli.ts split 70000

# View cap table
npx tsx cli.ts captable
```

## Using CLI in Docker

```bash
docker exec -it chainequity-api npx tsx cli.ts --help
docker exec -it chainequity-api npx tsx cli.ts captable
```

## Documentation

For complete CLI documentation, see:
- Main [README.md](../README.md#cli-usage)
- [CLI Guide](../docs/CLI_GUIDE.md)
