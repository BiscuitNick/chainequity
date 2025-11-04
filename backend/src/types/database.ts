/**
 * Database type definitions for ChainEquity backend
 */

export interface Event {
  id?: number;
  block_number: number;
  transaction_hash: string;
  event_type: EventType;
  from_address?: string | null;
  to_address?: string | null;
  amount?: string | null;
  data?: string | null; // JSON string
  timestamp: number;
  created_at?: number;
}

export type EventType =
  | 'Transfer'
  | 'WalletApproved'
  | 'WalletRevoked'
  | 'StockSplit'
  | 'SymbolChanged'
  | 'NameChanged'
  | 'TransferBlocked';

export interface Balance {
  address: string;
  balance: string; // BigNumber as string
  last_updated_block: number;
  last_updated_timestamp: number;
  created_at?: number;
  updated_at?: number;
}

export interface CorporateAction {
  id?: number;
  action_type: CorporateActionType;
  block_number: number;
  transaction_hash: string;
  old_value?: string | null;
  new_value?: string | null;
  timestamp: number;
  created_at?: number;
}

export type CorporateActionType = 'StockSplit' | 'SymbolChange' | 'NameChange';

export interface Metadata {
  key: string;
  value: string;
  updated_at?: number;
}

export interface EventData {
  // Additional event-specific data stored as JSON
  [key: string]: any;
}

export interface TransferEventData extends EventData {
  from: string;
  to: string;
  value: string;
}

export interface StockSplitEventData extends EventData {
  multiplier: string;
  newSplitMultiplier: string;
}

export interface SymbolChangedEventData extends EventData {
  oldSymbol: string;
  newSymbol: string;
}

export interface NameChangedEventData extends EventData {
  oldName: string;
  newName: string;
}

export interface WalletApprovedEventData extends EventData {
  wallet: string;
}

export interface WalletRevokedEventData extends EventData {
  wallet: string;
}

export interface TransferBlockedEventData extends EventData {
  from: string;
  to: string;
  amount: string;
}
