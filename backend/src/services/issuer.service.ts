/**
 * Issuer Service
 *
 * Handles all blockchain write operations for ChainEquityToken:
 * - Wallet approval/revocation (allowlist management)
 * - Token minting
 * - Corporate actions (stock splits, symbol changes)
 * - Transaction management with retry logic
 */

import { ethers } from 'ethers';
import { config } from '../config/env.js';
import { ChainEquityTokenABI, alchemyUtils } from '../config/alchemy.config.js';

/**
 * Transaction receipt with relevant information
 */
export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: number;
  timestamp?: number;
}

/**
 * Configuration for IssuerService
 */
export interface IssuerServiceConfig {
  rpcUrl: string;
  contractAddress: string;
  privateKey: string;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * IssuerService class
 *
 * Provides methods for interacting with ChainEquityToken smart contract
 * with transaction management, retry logic, and error handling.
 */
export class IssuerService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private retryConfig: RetryConfig;

  /**
   * Creates an instance of IssuerService
   *
   * @param config - Service configuration
   * @param retryConfig - Optional retry configuration
   */
  constructor(
    serviceConfig: IssuerServiceConfig,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    // Validate configuration
    if (!serviceConfig.rpcUrl) {
      throw new Error('RPC URL is required');
    }
    if (!serviceConfig.contractAddress) {
      throw new Error('Contract address is required');
    }
    if (!serviceConfig.privateKey) {
      throw new Error('Private key is required');
    }
    if (!alchemyUtils.isValidAddress(serviceConfig.contractAddress)) {
      throw new Error('Invalid contract address');
    }

    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(serviceConfig.rpcUrl);

    // Initialize wallet
    this.wallet = new ethers.Wallet(serviceConfig.privateKey, this.provider);

    // Initialize contract instance with signer
    this.contract = new ethers.Contract(
      serviceConfig.contractAddress,
      ChainEquityTokenABI,
      this.wallet
    );

    this.retryConfig = retryConfig;

    console.log(`IssuerService initialized for contract: ${serviceConfig.contractAddress}`);
    console.log(`Signer address: ${this.wallet.address}`);
  }

  /**
   * Get signer address
   */
  getSignerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contract.target as string;
  }

  // ============================================================================
  // WALLET MANAGEMENT METHODS
  // ============================================================================

  /**
   * Approve a wallet to send/receive tokens
   *
   * @param address - Wallet address to approve
   * @returns Transaction receipt
   */
  async approveWallet(address: string): Promise<TransactionReceipt> {
    if (!alchemyUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    console.log(`Approving wallet: ${address}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.approveWallet(address);
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Revoke wallet approval
   *
   * @param address - Wallet address to revoke
   * @returns Transaction receipt
   */
  async revokeWallet(address: string): Promise<TransactionReceipt> {
    if (!alchemyUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    console.log(`Revoking wallet: ${address}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.revokeWallet(address);
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Check if a wallet is approved
   *
   * @param address - Wallet address to check
   * @returns True if approved, false otherwise
   */
  async isWalletApproved(address: string): Promise<boolean> {
    if (!alchemyUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    return await this.contract.isApproved(address);
  }

  /**
   * Get all approved wallets by querying events
   * Note: This queries historical events, not recommended for large datasets
   *
   * @returns Array of approved wallet addresses
   */
  async getApprovedWallets(): Promise<string[]> {
    const approvedFilter = this.contract.filters.WalletApproved();
    const revokedFilter = this.contract.filters.WalletRevoked();

    const [approvedEvents, revokedEvents] = await Promise.all([
      this.contract.queryFilter(approvedFilter),
      this.contract.queryFilter(revokedFilter),
    ]);

    // Build set of approved addresses
    const approved = new Set<string>();

    // Add all approved addresses
    for (const event of approvedEvents) {
      if ('args' in event && event.args && event.args[0]) {
        approved.add(event.args[0].toLowerCase());
      }
    }

    // Remove revoked addresses
    for (const event of revokedEvents) {
      if ('args' in event && event.args && event.args[0]) {
        approved.delete(event.args[0].toLowerCase());
      }
    }

    return Array.from(approved);
  }

  // ============================================================================
  // TOKEN OPERATIONS
  // ============================================================================

  /**
   * Mint tokens to an address
   *
   * @param to - Recipient address (must be approved)
   * @param amount - Amount in token units (will be converted to wei)
   * @returns Transaction receipt
   */
  async mintTokens(to: string, amount: string): Promise<TransactionReceipt> {
    if (!alchemyUtils.isValidAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const decimals = await this.contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    console.log(`Minting ${amount} tokens to ${to} (${amountWei.toString()} wei)`);

    // Estimate gas first
    const gasEstimate = await this.contract.mint.estimateGas(to, amountWei);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.mint(to, amountWei, {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      });
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Get token balance of an address
   *
   * @param address - Address to query
   * @returns Balance in token units (human-readable)
   */
  async getBalance(address: string): Promise<string> {
    if (!alchemyUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const balance = await this.contract.balanceOf(address);
    const decimals = await this.contract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get total token supply
   *
   * @returns Total supply in token units (accounts for splits)
   */
  async getTotalSupply(): Promise<string> {
    const supply = await this.contract.totalSupply();
    const decimals = await this.contract.decimals();
    return ethers.formatUnits(supply, decimals);
  }

  // ============================================================================
  // CORPORATE ACTIONS
  // ============================================================================

  /**
   * Execute a stock split
   *
   * @param multiplier - Split multiplier (e.g., 7 for 7-for-1 split)
   * @returns Transaction receipt
   */
  async executeSplit(multiplier: number): Promise<TransactionReceipt> {
    if (multiplier <= 1) {
      throw new Error('Multiplier must be greater than 1');
    }

    console.log(`Executing ${multiplier}-for-1 stock split`);

    // Estimate gas
    const gasEstimate = await this.contract.executeSplit.estimateGas(multiplier);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.executeSplit(multiplier, {
        gasLimit: (gasEstimate * 120n) / 100n,
      });
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Get current split multiplier
   *
   * @returns Current split multiplier
   */
  async getSplitMultiplier(): Promise<number> {
    const multiplier = await this.contract.getSplitMultiplier();
    return Number(multiplier);
  }

  /**
   * Update token symbol
   *
   * @param newSymbol - New token symbol (3-5 uppercase characters)
   * @returns Transaction receipt
   */
  async updateSymbol(newSymbol: string): Promise<TransactionReceipt> {
    if (!/^[A-Z]{3,5}$/.test(newSymbol)) {
      throw new Error('Symbol must be 3-5 uppercase letters');
    }

    console.log(`Updating symbol to: ${newSymbol}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.updateSymbol(newSymbol);
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Update token name
   *
   * @param newName - New token name
   * @returns Transaction receipt
   */
  async updateName(newName: string): Promise<TransactionReceipt> {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    console.log(`Updating name to: ${newName}`);

    const tx = await this.executeWithRetry(async () => {
      return await this.contract.updateName(newName);
    });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }
    return this.formatReceipt(receipt);
  }

  /**
   * Get token info
   *
   * @returns Token name, symbol, decimals
   */
  async getTokenInfo(): Promise<{ name: string; symbol: string; decimals: number }> {
    const [name, symbol, decimals] = await Promise.all([
      this.contract.name(),
      this.contract.symbol(),
      this.contract.decimals(),
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
    };
  }

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  /**
   * Execute transaction with retry logic
   *
   * @param fn - Function that returns a transaction
   * @returns Transaction response
   */
  private async executeWithRetry(
    fn: () => Promise<ethers.ContractTransactionResponse>
  ): Promise<ethers.ContractTransactionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        console.error(`Transaction attempt ${attempt} failed:`, error);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );

        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw new Error(
      `Transaction failed after ${this.retryConfig.maxAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';

    // Non-retryable errors (logic/validation errors)
    const nonRetryable = [
      'invalid address',
      'insufficient funds',
      'nonce too low',
      'already known',
      'replacement transaction underpriced',
      'execution reverted',
    ];

    return nonRetryable.some(msg => errorMessage.includes(msg));
  }

  /**
   * Format transaction receipt
   */
  private formatReceipt(receipt: ethers.ContractTransactionReceipt): TransactionReceipt {
    return {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status || 0,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create IssuerService instance from environment variables
 */
export function createIssuerService(): IssuerService {
  const rpcUrl = `https://polygon-amoy.g.alchemy.com/v2/${config.alchemyApiKey}`;

  const privateKey = process.env.ISSUER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ISSUER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY must be set');
  }

  return new IssuerService({
    rpcUrl,
    contractAddress: config.tokenContractAddress,
    privateKey,
  });
}
