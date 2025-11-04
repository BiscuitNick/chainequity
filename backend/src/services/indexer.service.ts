/**
 * Event Indexer Service
 *
 * Real-time blockchain event monitoring and indexing using WebSocket connection.
 * Processes all ChainEquityToken events and maintains local database state.
 */

import { ethers } from 'ethers';
import { config } from '../config/env.js';
import { ChainEquityTokenABI } from '../config/alchemy.config.js';
import { getDatabase } from '../db/database.js';

/**
 * Event data structure
 */
interface ProcessedEvent {
  eventType: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  fromAddress?: string;
  toAddress?: string;
  value?: string;
  data: any;
  timestamp?: number;
}

/**
 * IndexerService Configuration
 */
interface IndexerConfig {
  rpcUrl: string;
  wsUrl: string;
  contractAddress: string;
  startBlock?: number;
}

/**
 * IndexerService Class
 *
 * Monitors blockchain for ChainEquityToken events in real-time
 */
export class IndexerService {
  private wsProvider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private db: ReturnType<typeof getDatabase>;
  private isRunning: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000; // 5 seconds
  private config: IndexerConfig;

  constructor(indexerConfig: IndexerConfig) {
    this.config = indexerConfig;
    this.db = getDatabase();
    console.log('IndexerService initialized');
  }

  /**
   * Start the event indexer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Indexer is already running');
      return;
    }

    console.log('\n🚀 Starting Event Indexer');
    console.log('='.repeat(60));
    console.log('Contract:', this.config.contractAddress);
    console.log('WebSocket URL:', this.config.wsUrl);

    try {
      await this.connect();
      await this.setupEventListeners();

      // Optionally sync historical events
      if (this.config.startBlock) {
        await this.syncHistoricalEvents(this.config.startBlock);
      }

      this.isRunning = true;
      console.log('✅ Event indexer started successfully\n');
    } catch (error) {
      console.error('❌ Failed to start indexer:', error);
      throw error;
    }
  }

  /**
   * Stop the event indexer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n⏹️  Stopping Event Indexer...');

    if (this.contract) {
      // Remove all listeners
      this.contract.removeAllListeners();
    }

    if (this.wsProvider) {
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    this.contract = null;
    this.isRunning = false;
    console.log('✅ Event indexer stopped\n');
  }

  /**
   * Connect to WebSocket provider
   */
  private async connect(): Promise<void> {
    try {
      console.log('📡 Connecting to WebSocket provider...');

      // Create WebSocket provider
      this.wsProvider = new ethers.WebSocketProvider(this.config.wsUrl);

      // Setup connection error handlers
      this.wsProvider.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection();
      });

      this.wsProvider.on('close', () => {
        console.log('WebSocket connection closed');
        this.handleDisconnection();
      });

      // Create contract instance
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        ChainEquityTokenABI,
        this.wsProvider
      );

      // Test connection
      const network = await this.wsProvider.getNetwork();
      console.log('✅ Connected to network:', network.name, `(chainId: ${network.chainId})`);

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
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
      console.error('❌ Max reconnection attempts reached. Stopping indexer.');
      await this.stop();
      return;
    }

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    // Wait before reconnecting (exponential backoff)
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    await this.sleep(delay);

    try {
      await this.connect();
      await this.setupEventListeners();
      console.log('✅ Reconnected successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.handleDisconnection();
    }
  }

  /**
   * Setup event listeners for all contract events
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    console.log('📋 Setting up event listeners...');

    // Transfer events
    this.contract.on('Transfer', async (from, to, value, event) => {
      await this.handleTransferEvent(from, to, value, event);
    });

    // WalletApproved events
    this.contract.on('WalletApproved', async (wallet, event) => {
      await this.handleWalletApprovedEvent(wallet, event);
    });

    // WalletRevoked events
    this.contract.on('WalletRevoked', async (wallet, event) => {
      await this.handleWalletRevokedEvent(wallet, event);
    });

    // StockSplit events
    this.contract.on('StockSplit', async (multiplier, newSplitMultiplier, event) => {
      await this.handleStockSplitEvent(multiplier, newSplitMultiplier, event);
    });

    // SymbolChanged events
    this.contract.on('SymbolChanged', async (oldSymbol, newSymbol, event) => {
      await this.handleSymbolChangedEvent(oldSymbol, newSymbol, event);
    });

    // NameChanged events
    this.contract.on('NameChanged', async (oldName, newName, event) => {
      await this.handleNameChangedEvent(oldName, newName, event);
    });

    // TransferBlocked events (if applicable)
    this.contract.on('TransferBlocked', async (from, to, amount, event) => {
      await this.handleTransferBlockedEvent(from, to, amount, event);
    });

    console.log('✅ Event listeners configured');
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle Transfer event
   */
  private async handleTransferEvent(
    from: string,
    to: string,
    value: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n📤 Transfer: ${ethers.formatEther(value)} tokens`);
      console.log(`   From: ${from}`);
      console.log(`   To: ${to}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'Transfer',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        fromAddress: from,
        toAddress: to,
        value: value.toString(),
        data: { from, to, value: value.toString() },
      };

      await this.saveEvent(processedEvent);

      // Update balances
      if (from !== ethers.ZeroAddress) {
        await this.updateBalance(from);
      }
      if (to !== ethers.ZeroAddress) {
        await this.updateBalance(to);
      }
    } catch (error) {
      console.error('Error handling Transfer event:', error);
    }
  }

  /**
   * Handle WalletApproved event
   */
  private async handleWalletApprovedEvent(
    wallet: string,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n✅ Wallet Approved: ${wallet}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'WalletApproved',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        toAddress: wallet,
        data: { wallet },
      };

      await this.saveEvent(processedEvent);
    } catch (error) {
      console.error('Error handling WalletApproved event:', error);
    }
  }

  /**
   * Handle WalletRevoked event
   */
  private async handleWalletRevokedEvent(
    wallet: string,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n❌ Wallet Revoked: ${wallet}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'WalletRevoked',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        toAddress: wallet,
        data: { wallet },
      };

      await this.saveEvent(processedEvent);
    } catch (error) {
      console.error('Error handling WalletRevoked event:', error);
    }
  }

  /**
   * Handle StockSplit event
   */
  private async handleStockSplitEvent(
    multiplier: bigint,
    newSplitMultiplier: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n📈 Stock Split: ${multiplier}-for-1`);
      console.log(`   New multiplier: ${newSplitMultiplier}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'StockSplit',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        data: {
          multiplier: multiplier.toString(),
          newSplitMultiplier: newSplitMultiplier.toString(),
        },
      };

      await this.saveEvent(processedEvent);

      // Update split multiplier in metadata
      this.db.setMetadata('split_multiplier', newSplitMultiplier.toString());

      // Update all balances to reflect new multiplier
      await this.recalculateAllBalances();
    } catch (error) {
      console.error('Error handling StockSplit event:', error);
    }
  }

  /**
   * Handle SymbolChanged event
   */
  private async handleSymbolChangedEvent(
    oldSymbol: string,
    newSymbol: string,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n🏷️  Symbol Changed: ${oldSymbol} → ${newSymbol}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'SymbolChanged',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        data: { oldSymbol, newSymbol },
      };

      await this.saveEvent(processedEvent);

      // Update symbol in metadata
      this.db.setMetadata('token_symbol', newSymbol);
    } catch (error) {
      console.error('Error handling SymbolChanged event:', error);
    }
  }

  /**
   * Handle NameChanged event
   */
  private async handleNameChangedEvent(
    oldName: string,
    newName: string,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n📝 Name Changed: ${oldName} → ${newName}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'NameChanged',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        data: { oldName, newName },
      };

      await this.saveEvent(processedEvent);

      // Update name in metadata
      this.db.setMetadata('token_name', newName);
    } catch (error) {
      console.error('Error handling NameChanged event:', error);
    }
  }

  /**
   * Handle TransferBlocked event
   */
  private async handleTransferBlockedEvent(
    from: string,
    to: string,
    amount: bigint,
    event: ethers.EventLog
  ): Promise<void> {
    try {
      console.log(`\n🚫 Transfer Blocked`);
      console.log(`   From: ${from}`);
      console.log(`   To: ${to}`);
      console.log(`   Amount: ${ethers.formatEther(amount)}`);
      console.log(`   Block: ${event.blockNumber}`);

      const processedEvent: ProcessedEvent = {
        eventType: 'TransferBlocked',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        logIndex: event.index,
        fromAddress: from,
        toAddress: to,
        value: amount.toString(),
        data: { from, to, amount: amount.toString() },
      };

      await this.saveEvent(processedEvent);
    } catch (error) {
      console.error('Error handling TransferBlocked event:', error);
    }
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Save event to database
   */
  private async saveEvent(event: ProcessedEvent): Promise<void> {
    try {
      // Get block timestamp if available
      if (!event.timestamp && this.wsProvider) {
        const block = await this.wsProvider.getBlock(event.blockNumber);
        event.timestamp = block?.timestamp;
      }

      this.db.insertEvent({
        event_type: event.eventType as any,
        transaction_hash: event.transactionHash,
        block_number: event.blockNumber,
        from_address: event.fromAddress || null,
        to_address: event.toAddress || null,
        amount: event.value || null,
        data: JSON.stringify(event.data),
        timestamp: event.timestamp || 0,
      });

      console.log(`   ✅ Event saved to database`);
    } catch (error) {
      console.error('Failed to save event:', error);
      throw error;
    }
  }

  /**
   * Update balance for an address
   */
  private async updateBalance(address: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const balance = await this.contract.balanceOf(address);

      const currentBlock = this.wsProvider
        ? await this.wsProvider.getBlockNumber()
        : 0;

      this.db.upsertBalance({
        address: address.toLowerCase(),
        balance: balance.toString(),
        last_updated_block: currentBlock,
        last_updated_timestamp: Date.now(),
      });

      console.log(`   💰 Updated balance for ${address}: ${ethers.formatEther(balance)}`);
    } catch (error) {
      console.error(`Failed to update balance for ${address}:`, error);
    }
  }

  /**
   * Recalculate all balances (used after stock split)
   */
  private async recalculateAllBalances(): Promise<void> {
    console.log('\n🔄 Recalculating all balances...');

    const balances = this.db.getAllBalances();

    for (const { address } of balances) {
      await this.updateBalance(address);
    }

    console.log(`✅ Recalculated ${balances.length} balances`);
  }

  /**
   * Sync historical events from a specific block
   */
  private async syncHistoricalEvents(fromBlock: number): Promise<void> {
    if (!this.contract || !this.wsProvider) {
      throw new Error('Contract or provider not initialized');
    }

    console.log(`\n📚 Syncing historical events from block ${fromBlock}...`);

    try {
      const currentBlock = await this.wsProvider.getBlockNumber();
      const toBlock = currentBlock;

      console.log(`   Current block: ${currentBlock}`);
      console.log(`   Blocks to process: ${toBlock - fromBlock + 1}`);

      // Query all events in batches
      const batchSize = 1000;

      for (let start = fromBlock; start <= toBlock; start += batchSize) {
        const end = Math.min(start + batchSize - 1, toBlock);

        console.log(`   Processing blocks ${start} to ${end}...`);

        const events = await this.contract.queryFilter('*', start, end);

        for (const event of events) {
          if (event instanceof ethers.EventLog) {
            await this.processHistoricalEvent(event);
          }
        }
      }

      console.log(`✅ Historical sync complete`);

      // Update last synced block
      this.db.setMetadata('last_synced_block', currentBlock.toString());
    } catch (error) {
      console.error('Failed to sync historical events:', error);
      throw error;
    }
  }

  /**
   * Process a historical event
   */
  private async processHistoricalEvent(event: ethers.EventLog): Promise<void> {
    // Route to appropriate handler based on event name
    const eventName = event.eventName;

    try {
      if (eventName === 'Transfer' && event.args) {
        await this.handleTransferEvent(event.args[0], event.args[1], event.args[2], event);
      } else if (eventName === 'WalletApproved' && event.args) {
        await this.handleWalletApprovedEvent(event.args[0], event);
      } else if (eventName === 'WalletRevoked' && event.args) {
        await this.handleWalletRevokedEvent(event.args[0], event);
      } else if (eventName === 'StockSplit' && event.args) {
        await this.handleStockSplitEvent(event.args[0], event.args[1], event);
      } else if (eventName === 'SymbolChanged' && event.args) {
        await this.handleSymbolChangedEvent(event.args[0], event.args[1], event);
      } else if (eventName === 'NameChanged' && event.args) {
        await this.handleNameChangedEvent(event.args[0], event.args[1], event);
      } else if (eventName === 'TransferBlocked' && event.args) {
        await this.handleTransferBlockedEvent(event.args[0], event.args[1], event.args[2], event);
      }
    } catch (error) {
      console.error(`Error processing historical event ${eventName}:`, error);
    }
  }

  /**
   * Get indexer status
   */
  public getStatus(): {
    isRunning: boolean;
    reconnectAttempts: number;
    hasConnection: boolean;
  } {
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      hasConnection: this.wsProvider !== null,
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
 * Create IndexerService from environment variables
 */
export function createIndexerService(): IndexerService {
  const wsUrl = config.alchemyApiKey
    ? `wss://polygon-amoy.g.alchemy.com/v2/${config.alchemyApiKey}`
    : '';

  if (!wsUrl) {
    throw new Error('ALCHEMY_API_KEY not set in environment');
  }

  if (!config.tokenContractAddress) {
    throw new Error('TOKEN_CONTRACT_ADDRESS not set in environment');
  }

  const rpcUrl = `https://polygon-amoy.g.alchemy.com/v2/${config.alchemyApiKey}`;

  return new IndexerService({
    rpcUrl,
    wsUrl,
    contractAddress: config.tokenContractAddress,
  });
}
