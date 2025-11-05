/**
 * useTokenInfo Hook
 *
 * Fetches general token information (name, symbol, total supply, etc.)
 */

import { useReadContract } from 'wagmi';
import { CHAIN_EQUITY_TOKEN_ABI, getContractAddress } from '@/lib/contract';
import { formatUnits } from 'viem';

export function useTokenInfo() {
  const contractAddress = getContractAddress();

  // Get token name
  const { data: name } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'name',
  });

  // Get token symbol
  const { data: symbol } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'symbol',
  });

  // Get decimals
  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'decimals',
  });

  // Get total supply
  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  // Get split multiplier
  const { data: splitMultiplier, isLoading: isSplitMultiplierLoading } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'splitMultiplier',
  });

  // Get owner
  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: CHAIN_EQUITY_TOKEN_ABI,
    functionName: 'owner',
  });

  // Format total supply with max 4 decimal places
  const formattedTotalSupply = totalSupply && decimals
    ? parseFloat(formatUnits(totalSupply, decimals)).toFixed(4).replace(/\.?0+$/, '')
    : '0';

  return {
    name: name ?? 'ChainEquity',
    symbol: symbol ?? 'CEQ',
    decimals: decimals ?? 18,
    totalSupply: totalSupply ?? 0n,
    formattedTotalSupply,
    splitMultiplier: splitMultiplier ?? 10000n,
    isSplitMultiplierLoading,
    owner,
    contractAddress,
  };
}
