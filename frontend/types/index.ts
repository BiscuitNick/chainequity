/**
 * Common TypeScript types for the ChainEquity dashboard
 */

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
}

export interface TokenBalance {
  address: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
}

export interface CapTableEntry {
  address: string;
  balance: string;
  ownershipPercentage: number;
  lastUpdated: number;
}

export interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  type: 'transfer' | 'mint' | 'approve' | 'revoke' | 'split' | 'symbol-change';
}

export interface CorporateAction {
  id: string;
  type: 'split' | 'symbol-change';
  blockNumber: number;
  transactionHash: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
