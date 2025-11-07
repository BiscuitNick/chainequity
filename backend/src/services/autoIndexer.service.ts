/**
 * Auto Indexer Service
 *
 * Automatically indexes blockchain events in real-time for local development.
 * Subscribes to new block events via WebSocket and triggers indexing.
 *
 * Features:
 * - WebSocket block subscription with debouncing
 * - Automatic reconnection with exponential backoff
 * - Minimal logging (only new blocks)
 * - Local development only (localhost guard)
 */

import { ethers } from 'ethers';
import { config } from '../config/env.js';
import { getDatabase } from '../db/database.js';
import { ChainEquityTokenABI } from '../config/alchemy.config.js';

/**
 * AutoIndexerService Configuration
 */
interface AutoIndexerConfig {
  wsUrl: string;
  contractAddress: string;
  debounceMs?: number;
  pollingIntervalMs?: number;
}

/**
 * AutoIndexerService Class
 *
 * Watches for new blocks on local Hardhat node and automatically syncs events
 */
export class AutoIndexerService {
  private wsProvider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private db: ReturnType<typeof getDatabase>;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000; // 1 second
  private maxReconnectDelay: number = 8000; // 8 seconds max
  private config: AutoIndexerConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private pendingSync: boolean = false;
  private lastProcessedBlock: number = 0;

  constructor(autoIndexerConfig: AutoIndexerConfig) {
    this.config = {
      debounceMs: 400, // 400ms default debounce
      pollingIntervalMs: 3000, // 3 seconds default polling
      ...autoIndexerConfig,
    };
    this.db = getDatabase();

    // Validate this is localhost only
    if (!this.isLocalhost(this.config.wsUrl)) {
      throw new Error(
        'AutoIndexerService only supports localhost connections for development. ' +
          `Provided URL: ${this.config.wsUrl}`
      );
    }

    console.log('AutoIndexerService initialized');
  }

  /**
   * Check if URL is localhost or local Docker network
   */
  private isLocalhost(url: string): boolean {
    return (
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('0.0.0.0') ||
      url.includes('hardhat') // Allow Docker service name
    );
  }

  /**
   * Start the auto-indexer service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Auto-indexer is already running');
      return;
    }

    console.log('\n🤖 Starting Auto-Indexer for Local Development');
    console.log('='.repeat(60));
    console.log('WebSocket URL:', this.config.wsUrl);
    console.log('Contract:', this.config.contractAddress);
    console.log('Debounce:', `${this.config.debounceMs}ms`);
    console.log('='.repeat(60));

    try {
      await this.connect();
      this.isRunning = true;
      this.startPolling();
      console.log('✅ Auto-indexer started successfully');
      console.log('👀 Watching for new blocks...\n');
    } catch (error) {
      console.error('❌ Failed to start auto-indexer:', error);
      throw error;
    }
  }

  /**
   * Stop the auto-indexer service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n⏹️  Stopping Auto-Indexer...');

    // Clear any pending debounce timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Stop polling
    this.stopPolling();

    // Clear contract reference
    this.contract = null;

    // Close WebSocket connection
    if (this.wsProvider) {
      // Remove provider event listeners
      this.wsProvider.removeAllListeners();

      // Remove underlying WebSocket event listeners
      const ws = (this.wsProvider as any).websocket;
      if (ws) {
        ws.removeAllListeners();
      }

      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    this.isRunning = false;
    console.log('✅ Auto-indexer stopped\n');
  }

  /**
   * Connect to WebSocket provider and set up block listener
   */
  private async connect(): Promise<void> {
    try {
      console.log('📡 Connecting to local node...');

      // Create WebSocket provider
      this.wsProvider = new ethers.WebSocketProvider(this.config.wsUrl);

      // Test connection
      const network = await this.wsProvider.getNetwork();
      console.log(
        '✅ Connected to network:',
        network.name,
        `(chainId: ${network.chainId})`
      );

      // Create contract instance
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        ChainEquityTokenABI,
        this.wsProvider
      );

      // Set up block listener
      this.setupBlockListener();

      // Get initial state
      const lastSyncedBlock = this.db.getMetadata('last_synced_block');
      this.lastProcessedBlock = lastSyncedBlock
        ? parseInt(lastSyncedBlock)
        : 0;

      if (this.lastProcessedBlock > 0) {
        console.log(
          `📚 Last synced block: ${this.lastProcessedBlock}`
        );
      }

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Set up block event listener with debouncing
   */
  private setupBlockListener(): void {
    if (!this.wsProvider) {
      throw new Error('WebSocket provider not initialized');
    }

    // Listen for new blocks
    this.wsProvider.on('block', (blockNumber: number) => {
      this.handleNewBlock(blockNumber);
    });

    // Access the underlying WebSocket connection for error/close events
    // In ethers v6, we need to access the websocket property directly
    const ws = (this.wsProvider as any).websocket;

    if (ws) {
      // Handle WebSocket errors
      ws.on('error', (error: any) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection();
      });

      // Handle WebSocket close
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.handleDisconnection();
      });
    }

    console.log('✅ Block listener configured');
  }

  /**
   * Handle new block event with debouncing
   */
  private handleNewBlock(blockNumber: number): void {
    // Skip if we've already processed this block
    if (blockNumber <= this.lastProcessedBlock) {
      return;
    }

    // Mark that we have a pending sync
    this.pendingSync = true;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.syncEvents(blockNumber);
    }, this.config.debounceMs);
  }

  /**
   * Sync events from last synced block to current block
   */
  private async syncEvents(currentBlock: number): Promise<void> {
    if (!this.contract || !this.pendingSync) {
      return;
    }

    this.pendingSync = false;

    try {
      const lastSyncedBlock = this.db.getMetadata('last_synced_block');
      const fromBlock = lastSyncedBlock
        ? parseInt(lastSyncedBlock) + 1
        : currentBlock;

      // Only sync if there are new blocks
      if (fromBlock > currentBlock) {
        return;
      }

      const blockRange =
        fromBlock === currentBlock ? '1 block' : `${currentBlock - fromBlock + 1} blocks`;

      // Start timing
      const startTime = Date.now();

      // Use the indexer's syncHistoricalEvents method
      // Note: We need to call the private method via a workaround
      // For now, we'll use a simplified approach
      await this.syncHistoricalEventsRange(fromBlock, currentBlock);

      const duration = Date.now() - startTime;

      // Count events processed
      const eventCount = this.getEventCountSince(lastSyncedBlock);

      // Minimal logging - only show when events are processed
      if (eventCount > 0 || fromBlock !== currentBlock) {
        console.log(
          `📦 Block ${currentBlock} | Synced ${blockRange} | ${eventCount} events | ${duration}ms`
        );
      }

      // Update last processed block
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error('❌ Error syncing events:', error);
    }
  }

  /**
   * Sync historical events in a range
   */
  private async syncHistoricalEventsRange(
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    if (!this.contract || !this.wsProvider) {
      return;
    }

    try {
      // Query all events from the contract
      const events = await this.contract.queryFilter('*', fromBlock, toBlock);

      // Process each event
      for (const event of events) {
        if (event instanceof ethers.EventLog) {
          await this.processEvent(event);
        }
      }

      // Update last synced block
      this.db.setMetadata('last_synced_block', toBlock.toString());
    } catch (error) {
      console.error('Error syncing events:', error);
      throw error;
    }
  }

  /**
   * Process a single event and save to database
   */
  private async processEvent(event: ethers.EventLog): Promise<void> {
    try {
      const eventName = event.eventName;

      // Get block timestamp and transaction receipt (for gas data)
      const [block, receipt] = await Promise.all([
        this.wsProvider?.getBlock(event.blockNumber),
        this.wsProvider?.getTransactionReceipt(event.transactionHash),
      ]);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      // Extract gas data from receipt
      const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : null;
      const gasPrice = receipt?.gasPrice ? receipt.gasPrice.toString() : null;

      // Save to database based on event type
      if (eventName === 'Transfer' && event.args) {
        const [from, to, value] = event.args;

        this.db.insertEvent({
          event_type: 'Transfer',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: from,
          to_address: to,
          amount: value.toString(),
          data: JSON.stringify({ from, to, value: value.toString() }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });

        // Update balances
        if (this.contract) {
          // Get current split multiplier to divide it out
          const splitMultiplier = await this.contract.splitMultiplier();
          const BASIS_POINTS = 10000n;

          if (from !== ethers.ZeroAddress) {
            const balanceWithMultiplier = await this.contract.balanceOf(from);
            // Store raw balance: (balanceWithMultiplier * BASIS_POINTS) / splitMultiplier
            const rawBalance = (balanceWithMultiplier * BASIS_POINTS) / splitMultiplier;
            this.db.upsertBalance({
              address: from.toLowerCase(),
              balance: rawBalance.toString(),
              last_updated_block: event.blockNumber,
              last_updated_timestamp: Date.now(),
            });
          }
          if (to !== ethers.ZeroAddress) {
            const balanceWithMultiplier = await this.contract.balanceOf(to);
            // Store raw balance: (balanceWithMultiplier * BASIS_POINTS) / splitMultiplier
            const rawBalance = (balanceWithMultiplier * BASIS_POINTS) / splitMultiplier;
            this.db.upsertBalance({
              address: to.toLowerCase(),
              balance: rawBalance.toString(),
              last_updated_block: event.blockNumber,
              last_updated_timestamp: Date.now(),
            });
          }
        }
      } else if (eventName === 'WalletApproved' && event.args) {
        const [wallet] = event.args;

        this.db.insertEvent({
          event_type: 'WalletApproved',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: null,
          to_address: wallet,
          amount: null,
          data: JSON.stringify({ wallet }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });
      } else if (eventName === 'WalletRevoked' && event.args) {
        const [wallet] = event.args;

        this.db.insertEvent({
          event_type: 'WalletRevoked',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: null,
          to_address: wallet,
          amount: null,
          data: JSON.stringify({ wallet }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });
      } else if (eventName === 'StockSplit' && event.args) {
        const [multiplier, newSplitMultiplier] = event.args;

        this.db.insertEvent({
          event_type: 'StockSplit',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: null,
          to_address: null,
          amount: null,
          data: JSON.stringify({
            multiplier: multiplier.toString(),
            newSplitMultiplier: newSplitMultiplier.toString(),
          }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });

        // Save to corporate_actions table
        this.db.insertCorporateAction({
          action_type: 'StockSplit',
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          old_value: multiplier.toString(),
          new_value: newSplitMultiplier.toString(),
          timestamp,
        });

        // Update split multiplier in metadata
        this.db.setMetadata('split_multiplier', newSplitMultiplier.toString());
      } else if (eventName === 'SymbolChanged' && event.args) {
        const [oldSymbol, newSymbol] = event.args;

        this.db.insertEvent({
          event_type: 'SymbolChanged',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: null,
          to_address: null,
          amount: null,
          data: JSON.stringify({ oldSymbol, newSymbol }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });

        // Save to corporate_actions table
        this.db.insertCorporateAction({
          action_type: 'SymbolChange',
          block_number: event.blockNumber,
          transaction_hash: event.transactionHash,
          old_value: oldSymbol,
          new_value: newSymbol,
          timestamp,
        });

        // Update symbol in metadata
        this.db.setMetadata('token_symbol', newSymbol);
      } else if (eventName === 'NameChanged' && event.args) {
        const [oldName, newName] = event.args;

        this.db.insertEvent({
          event_type: 'NameChanged',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: null,
          to_address: null,
          amount: null,
          data: JSON.stringify({ oldName, newName }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });

        // Update name in metadata
        this.db.setMetadata('token_name', newName);
      } else if (eventName === 'TransferBlocked' && event.args) {
        const [from, to, amount] = event.args;

        this.db.insertEvent({
          event_type: 'TransferBlocked',
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          from_address: from,
          to_address: to,
          amount: amount.toString(),
          data: JSON.stringify({ from, to, amount: amount.toString() }),
          gas_used: gasUsed,
          gas_price: gasPrice,
          timestamp,
        });
      }
    } catch (error) {
      console.error(`Error processing event ${event.eventName}:`, error);
    }
  }

  /**
   * Get count of events processed since a specific block
   */
  private getEventCountSince(sinceBlock: string | undefined): number {
    try {
      const blockNum = sinceBlock ? parseInt(sinceBlock) : 0;

      // Query database for event count
      const events = this.db.getAllEvents(1000);
      return events.filter((e) => e.block_number > blockNum).length;
    } catch {
      return 0;
    }
  }

  /**
   * Handle WebSocket disconnection with auto-reconnect
   */
  private async handleDisconnection(): Promise<void> {
    if (!this.isRunning) {
      return; // Don't reconnect if we're stopping
    }

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error(
        '❌ Max reconnection attempts reached. Stopping auto-indexer.'
      );
      await this.stop();
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    // Wait before reconnecting
    await this.sleep(delay);

    try {
      // Clean up existing connections
      if (this.wsProvider) {
        this.wsProvider.removeAllListeners();

        // Remove underlying WebSocket event listeners
        const ws = (this.wsProvider as any).websocket;
        if (ws) {
          ws.removeAllListeners();
        }

        await this.wsProvider.destroy();
        this.wsProvider = null;
      }

      // Clear contract reference
      this.contract = null;

      // Reconnect
      await this.connect();
      console.log('✅ Reconnected successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.handleDisconnection();
    }
  }

  /**
   * Start polling to check for missed blocks
   */
  private startPolling() {
    if (this.pollingInterval || !this.config.pollingIntervalMs) {
      return;
    }

    this.pollingInterval = setInterval(() => {
      this.checkForMissedBlocks().catch((err) => {
        if (this.isRunning) {
          console.error('Polling error:', err?.message || err);
        }
      });
    }, this.config.pollingIntervalMs);
  }

  /**
   * Check for missed blocks
   */
  private async checkForMissedBlocks() {
    if (!this.wsProvider || !this.contract || !this.isRunning) {
      return;
    }

    const currentBlock = await this.wsProvider.getBlockNumber();
    if (currentBlock > this.lastProcessedBlock) {
      console.log(`🔍 Poll detected gap: block ${currentBlock}, last ${this.lastProcessedBlock}`);
      this.handleNewBlock(currentBlock);
    }
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Get auto-indexer status
   */
  public getStatus(): {
    isRunning: boolean;
    reconnectAttempts: number;
    hasConnection: boolean;
    lastProcessedBlock: number;
  } {
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      hasConnection: this.wsProvider !== null,
      lastProcessedBlock: this.lastProcessedBlock,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create AutoIndexerService from environment variables
 */
export function createAutoIndexerService(): AutoIndexerService {
  // Only run for local development
  if (!config.useLocalNetwork) {
    throw new Error(
      'AutoIndexerService requires USE_LOCAL_NETWORK=true in environment'
    );
  }

  if (!config.tokenContractAddress) {
    throw new Error('TOKEN_CONTRACT_ADDRESS not set in environment');
  }

  // Convert HTTP URL to WebSocket URL for local Hardhat
  const wsUrl = config.localRpcUrl.replace('http://', 'ws://').replace('https://', 'wss://');

  console.log('🔧 Creating auto-indexer for local development');

  return new AutoIndexerService({
    wsUrl,
    contractAddress: config.tokenContractAddress,
    debounceMs: 400,
  });
}
