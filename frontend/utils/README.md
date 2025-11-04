# utils/

Utility functions for common operations in the ChainEquity dashboard.

## Structure

- `format.ts` - Formatting functions (addresses, numbers, dates)
- `validation.ts` - Input validation helpers
- `constants.ts` - Application constants
- `api.ts` - API client helpers

## Usage

```typescript
import { formatAddress, formatTokenAmount } from '@/utils/format';
import { isValidAddress } from '@/utils/validation';

const shortAddress = formatAddress('0x1234...'); // "0x1234...5678"
const amount = formatTokenAmount('1000000000000000000'); // "1.0"
```
