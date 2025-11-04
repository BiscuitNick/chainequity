/**
 * Blockchain event listener service using Alchemy WebSockets
 */

import { getAlchemy, ChainEquityTokenABI } from '../config/alchemy.config.js';
import { config } from '../config/env.js';
import { getDatabase } from '../db/database.js';
import type { EventType as _EventType } from '../types/database.js';

export class EventListenerService {
  private alchemy: ReturnType<typeof getAlchemy>;
  private db: ReturnType<typeof getDatabase>;
  private isListening: boolean = false;

  constructor(db?: ReturnType<typeof getDatabase>) {
    this.alchemy = getAlchemy();
    this.db = db || getDatabase();
  }

  /**
   * Start listening to contract events
   */
  public async start(): Promise<void> {
    if (this.isListening) {
      console.log('Event listener is already running');
      return;
    }

    if (!config.tokenContractAddress) {
      console.warn('Token contract address not configured. Skipping event listener.');
      return;
    }

    console.log(`Starting event listener for contract: ${config.tokenContractAddress}`);

    try {
      // Subscribe to all Transfer events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('Transfer(address,address,uint256)')],
        },
        (log) => this.handleTransferEvent(log)
      );

      // Subscribe to WalletApproved events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('WalletApproved(address)')],
        },
        (log) => this.handleWalletApprovedEvent(log)
      );

      // Subscribe to WalletRevoked events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('WalletRevoked(address)')],
        },
        (log) => this.handleWalletRevokedEvent(log)
      );

      // Subscribe to StockSplit events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('StockSplit(uint256,uint256)')],
        },
        (log) => this.handleStockSplitEvent(log)
      );

      // Subscribe to SymbolChanged events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('SymbolChanged(string,string)')],
        },
        (log) => this.handleSymbolChangedEvent(log)
      );

      // Subscribe to NameChanged events
      this.alchemy.ws.on(
        {
          address: config.tokenContractAddress,
          topics: [this.alchemy.utils.id('NameChanged(string,string)')],
        },
        (log) => this.handleNameChangedEvent(log)
      );

      this.isListening = true;
      console.log('Event listener started successfully');
    } catch (error) {
      console.error('Failed to start event listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  public stop(): void {
    if (!this.isListening) {
      return;
    }

    this.alchemy.ws.removeAllListeners();
    this.isListening = false;
    console.log('Event listener stopped');
  }

  /**
   * Handle Transfer events
   */
  private async handleTransferEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      // Decode event data
      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const from = decoded.args[0];
      const to = decoded.args[1];
      const value = decoded.args[2].toString();

      // Store event in database
      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'Transfer',
        from_address: from,
        to_address: to,
        amount: value,
        data: JSON.stringify({ from, to, value }),
        timestamp,
      });

      // Update balances
      this.updateBalances(from, to, log.blockNumber, timestamp);

      console.log(`Transfer event processed: ${from} -> ${to} (${value})`);
    } catch (error) {
      console.error('Error handling Transfer event:', error);
    }
  }

  /**
   * Handle WalletApproved events
   */
  private async handleWalletApprovedEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const wallet = decoded.args[0];

      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'WalletApproved',
        to_address: wallet,
        data: JSON.stringify({ wallet }),
        timestamp,
      });

      console.log(`WalletApproved event processed: ${wallet}`);
    } catch (error) {
      console.error('Error handling WalletApproved event:', error);
    }
  }

  /**
   * Handle WalletRevoked events
   */
  private async handleWalletRevokedEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const wallet = decoded.args[0];

      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'WalletRevoked',
        from_address: wallet,
        data: JSON.stringify({ wallet }),
        timestamp,
      });

      console.log(`WalletRevoked event processed: ${wallet}`);
    } catch (error) {
      console.error('Error handling WalletRevoked event:', error);
    }
  }

  /**
   * Handle StockSplit events
   */
  private async handleStockSplitEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const multiplier = decoded.args[0].toString();
      const newSplitMultiplier = decoded.args[1].toString();

      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'StockSplit',
        data: JSON.stringify({ multiplier, newSplitMultiplier }),
        timestamp,
      });

      // Store as corporate action
      this.db.insertCorporateAction({
        action_type: 'StockSplit',
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        old_value: multiplier,
        new_value: newSplitMultiplier,
        timestamp,
      });

      // Update metadata
      this.db.setMetadata('split_multiplier', newSplitMultiplier);

      console.log(`StockSplit event processed: ${multiplier}x -> ${newSplitMultiplier}`);
    } catch (error) {
      console.error('Error handling StockSplit event:', error);
    }
  }

  /**
   * Handle SymbolChanged events
   */
  private async handleSymbolChangedEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const oldSymbol = decoded.args[0];
      const newSymbol = decoded.args[1];

      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'SymbolChanged',
        data: JSON.stringify({ oldSymbol, newSymbol }),
        timestamp,
      });

      // Store as corporate action
      this.db.insertCorporateAction({
        action_type: 'SymbolChange',
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        old_value: oldSymbol,
        new_value: newSymbol,
        timestamp,
      });

      console.log(`SymbolChanged event processed: ${oldSymbol} -> ${newSymbol}`);
    } catch (error) {
      console.error('Error handling SymbolChanged event:', error);
    }
  }

  /**
   * Handle NameChanged events
   */
  private async handleNameChangedEvent(log: any): Promise<void> {
    try {
      const block = await this.alchemy.core.getBlock(log.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      const iface = new this.alchemy.utils.Interface(ChainEquityTokenABI);
      const decoded = iface.parseLog(log);

      if (!decoded) return;

      const oldName = decoded.args[0];
      const newName = decoded.args[1];

      this.db.insertEvent({
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        event_type: 'NameChanged',
        data: JSON.stringify({ oldName, newName }),
        timestamp,
      });

      // Store as corporate action
      this.db.insertCorporateAction({
        action_type: 'NameChange',
        block_number: log.blockNumber,
        transaction_hash: log.transactionHash,
        old_value: oldName,
        new_value: newName,
        timestamp,
      });

      console.log(`NameChanged event processed: ${oldName} -> ${newName}`);
    } catch (error) {
      console.error('Error handling NameChanged event:', error);
    }
  }

  /**
   * Update balances after a transfer
   */
  private async updateBalances(
    from: string,
    to: string,
    blockNumber: number,
    timestamp: number
  ): Promise<void> {
    try {
      // Get current balances from contract
      const contract = await this.alchemy.eth.getContract(
        config.tokenContractAddress,
        ChainEquityTokenABI
      );

      // Update sender balance (if not minting)
      if (from !== '0x0000000000000000000000000000000000000000') {
        const fromBalance = await contract.balanceOf(from);
        this.db.upsertBalance({
          address: from,
          balance: fromBalance.toString(),
          last_updated_block: blockNumber,
          last_updated_timestamp: timestamp,
        });
      }

      // Update recipient balance (if not burning)
      if (to !== '0x0000000000000000000000000000000000000000') {
        const toBalance = await contract.balanceOf(to);
        this.db.upsertBalance({
          address: to,
          balance: toBalance.toString(),
          last_updated_block: blockNumber,
          last_updated_timestamp: timestamp,
        });
      }
    } catch (error) {
      console.error('Error updating balances:', error);
    }
  }
}

// Export singleton instance
let listenerInstance: EventListenerService | null = null;

export function getEventListener(): EventListenerService {
  if (!listenerInstance) {
    listenerInstance = new EventListenerService();
  }
  return listenerInstance;
}
