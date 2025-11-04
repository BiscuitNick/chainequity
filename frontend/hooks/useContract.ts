/**
 * useContract Hook
 *
 * Provides contract address and ABI for use with wagmi hooks
 *
 * For type-safe contract interactions, use wagmi hooks directly:
 * - useReadContract for reading
 * - useWriteContract for writing
 * - useSimulateContract for simulating transactions
 */

import { CHAIN_EQUITY_TOKEN_ABI, getContractAddress } from '@/lib/contract';

export function useContract() {
  return {
    address: getContractAddress(),
    abi: CHAIN_EQUITY_TOKEN_ABI,
  } as const;
}
