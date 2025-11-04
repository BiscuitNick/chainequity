/**
 * useTokenBalance Hook
 *
 * Fetches token balance for a given address, accounting for split multiplier
 */

import { useReadContract } from 'wagmi';
import { CHAIN_EQUITY_TOKEN_ABI, getContractAddress } from '@/lib/contract';
import { formatUnits } from 'viem';
import type { Address } from 'viem';

interface UseTokenBalanceOptions {
  address?: Address | undefined;
  watch?: boolean | undefined;
}

export function useTokenBalance({ address, watch = false }: UseTokenBalanceOptions = {}) {
  const contractAddress = getContractAddress();

  // Get balance
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: watch ? 10000 : false, // Refetch every 10s if watch is true
    },
  });

  // Get decimals
  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'decimals',
  });

  // Get split multiplier
  const { data: splitMultiplier } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'splitMultiplier',
  });

  // Format balance
  const formattedBalance = balance && decimals
    ? formatUnits(balance, decimals)
    : '0';

  return {
    balance: balance ?? 0n,
    formattedBalance,
    decimals: decimals ?? 18,
    splitMultiplier: splitMultiplier ?? 1n,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  };
}
