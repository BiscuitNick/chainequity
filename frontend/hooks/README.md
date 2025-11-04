# hooks/

Custom React hooks for Web3 interactions and state management.

## Structure

- `useWallet.ts` - Wallet connection and account management
- `useContract.ts` - Contract interaction hook
- `useBalance.ts` - Token balance queries
- `useCapTable.ts` - Cap-table data fetching
- `useTransaction.ts` - Transaction state management

## Usage

```typescript
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';

function MyComponent() {
  const { address, connect, disconnect } = useWallet();
  const contract = useContract();
  // ...
}
```
