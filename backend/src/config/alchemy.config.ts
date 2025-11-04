/**
 * Alchemy SDK configuration for blockchain interaction
 */

import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { config } from './env.js';

/**
 * Get Alchemy Network enum from string
 */
function getAlchemyNetwork(networkName: string): Network {
  const networkMap: Record<string, Network> = {
    'polygon-amoy': Network.MATIC_AMOY,
    'polygon-mainnet': Network.MATIC_MAINNET,
    'eth-mainnet': Network.ETH_MAINNET,
    'eth-sepolia': Network.ETH_SEPOLIA,
  };

  const network = networkMap[networkName.toLowerCase()];
  if (!network) {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  return network;
}

/**
 * Alchemy SDK settings
 */
const settings: AlchemySettings = {
  apiKey: config.alchemyApiKey,
  network: getAlchemyNetwork(config.alchemyNetwork),
};

/**
 * Alchemy instance singleton
 */
let alchemyInstance: Alchemy | null = null;

/**
 * Get or create Alchemy instance
 */
export function getAlchemy(): Alchemy {
  if (!alchemyInstance) {
    alchemyInstance = new Alchemy(settings);
    console.log(`Alchemy SDK initialized for network: ${config.alchemyNetwork}`);
  }
  return alchemyInstance;
}

/**
 * Utility functions for blockchain interaction
 */
export const alchemyUtils = {
  /**
   * Convert wei to ether string
   */
  weiToEther(wei: string | bigint): string {
    const value = typeof wei === 'string' ? BigInt(wei) : wei;
    const ether = Number(value) / 1e18;
    return ether.toString();
  },

  /**
   * Convert ether to wei string
   */
  etherToWei(ether: string | number): string {
    const value = typeof ether === 'string' ? parseFloat(ether) : ether;
    const wei = BigInt(Math.floor(value * 1e18));
    return wei.toString();
  },

  /**
   * Format address to checksum format
   */
  toChecksumAddress(address: string): string {
    // Simple lowercase for now; proper checksum requires ethers
    return address.toLowerCase();
  },

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Validate transaction hash
   */
  isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  },
};

/**
 * Contract ABI for ChainEquityToken
 * This should be imported from the compiled contract artifacts
 */
export const ChainEquityTokenABI = [
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event WalletApproved(address indexed wallet)',
  'event WalletRevoked(address indexed wallet)',
  'event StockSplit(uint256 multiplier, uint256 newSplitMultiplier)',
  'event SymbolChanged(string oldSymbol, string newSymbol)',
  'event NameChanged(string oldName, string newName)',
  'event TransferBlocked(address indexed from, address indexed to, uint256 amount)',

  // Read functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowlist(address account) view returns (bool)',
  'function splitMultiplier() view returns (uint256)',
  'function owner() view returns (address)',
  'function isApproved(address wallet) view returns (bool)',
  'function getSplitMultiplier() view returns (uint256)',

  // Write functions (only callable by owner or authorized addresses)
  'function approveWallet(address wallet)',
  'function revokeWallet(address wallet)',
  'function executeSplit(uint256 multiplier)',
  'function updateSymbol(string newSymbol)',
  'function updateName(string newName)',
  'function mint(address to, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const;

export { Alchemy, Network };
