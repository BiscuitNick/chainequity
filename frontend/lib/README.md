# lib/

This directory contains library configurations and clients for external services.

## Structure

- `alchemy.ts` - Alchemy SDK configuration for blockchain interactions
- `contract.ts` - ChainEquityToken contract instance and ABI
- `utils.ts` - Web3 utility functions (address formatting, unit conversion, etc.)

## Usage

```typescript
import { alchemyClient } from '@/lib/alchemy';
import { getContract } from '@/lib/contract';
```
