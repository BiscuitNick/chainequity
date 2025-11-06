/**
 * Cap-Table Service
 *
 * Generates ownership analytics and cap-table reports with export capabilities.
 * Supports historical queries and real-time ownership tracking.
 */

import { getDatabase } from '../db/database.js';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

/**
 * Cap-table entry
 */
export interface CapTableEntry {
  address: string;
  balance: string;
  balanceFormatted: string;
  ownershipPercentage: number;
  lastUpdated?: number;
}

/**
 * Cap-table with metadata
 */
export interface CapTable {
  entries: CapTableEntry[];
  totalSupply: string;
  totalSupplyFormatted: string;
  holderCount: number;
  splitMultiplier: number;
  generatedAt: number;
  blockNumber: number;
}

/**
 * Ownership distribution statistics
 */
export interface OwnershipDistribution {
  holderCount: number;
  totalSupply: string;
  medianHolding: string;
  averageHolding: string;
  topHoldersPercentage: number; // Top 10 holders
  concentrationRatio: number; // HHI (Herfindahl-Hirschman Index)
}

/**
 * CapTableService Class
 */
export class CapTableService {
  private db: ReturnType<typeof getDatabase>;

  constructor(db?: ReturnType<typeof getDatabase>) {
    this.db = db || getDatabase();
  }

  /**
   * Generate cap-table
   *
   * @param blockNumber - Optional block number for historical query
   * @returns Cap-table with all holders and ownership data
   */
  generateCapTable(blockNumber?: number): CapTable {
    // If block number specified, use historical snapshot
    if (blockNumber !== undefined) {
      return this.getSnapshotAtBlock(blockNumber);
    }

    console.log('\n📊 Generating Cap-Table...');

    // Get all balances
    const balances = this.db.getAllBalances();

    if (balances.length === 0) {
      console.log('⚠️  No balances found in database');
      const latestBlock = this.db.getLatestBlock();
      return {
        entries: [],
        totalSupply: '0',
        totalSupplyFormatted: '0',
        holderCount: 0,
        splitMultiplier: 1,
        generatedAt: Date.now(),
        blockNumber: latestBlock,
      };
    }

    // Get split multiplier (stored in basis points, 10000 = 1.0x)
    const splitMultiplierStr = this.db.getMetadata('split_multiplier');
    const splitMultiplierBP = splitMultiplierStr ? parseInt(splitMultiplierStr) : 10000;
    const splitMultiplier = splitMultiplierBP / 10000;

    // Calculate total supply (sum of all balances)
    let totalSupply = BigInt(0);
    for (const balance of balances) {
      totalSupply += BigInt(balance.balance);
    }

    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
    console.log(`   Split Multiplier: ${splitMultiplier}x`);
    console.log(`   Holders: ${balances.length}`);

    // Generate entries with ownership percentages
    const entries: CapTableEntry[] = balances.map((balance) => {
      const balanceBigInt = BigInt(balance.balance);
      const ownershipPercentage =
        totalSupply > 0 ? (Number(balanceBigInt) / Number(totalSupply)) * 100 : 0;

      return {
        address: balance.address,
        balance: balance.balance,
        balanceFormatted: ethers.formatEther(balanceBigInt), // Raw value, frontend applies multiplier
        ownershipPercentage,
        lastUpdated: balance.last_updated_timestamp || undefined,
      };
    });

    // Sort by balance descending
    entries.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
    });

    console.log('✅ Cap-table generated\n');

    // Get latest block number from database
    const latestBlock = this.db.getLatestBlock();

    return {
      entries,
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: ethers.formatEther(totalSupply), // Raw value, frontend applies multiplier
      holderCount: entries.length,
      splitMultiplier,
      generatedAt: Date.now(),
      blockNumber: latestBlock,
    };
  }

  /**
   * Get historical cap-table snapshot at a specific block
   *
   * @param blockNumber - Block number to query
   * @returns Historical cap-table at that block
   */
  getSnapshotAtBlock(blockNumber: number): CapTable {
    console.log(`\n📊 Generating Historical Cap-Table at block ${blockNumber}...`);

    // Get all Transfer events up to and including the specified block
    const allEvents = this.db.getEventsByBlockRange(0, blockNumber);

    // Filter for Transfer events only
    const transferEvents = allEvents.filter((event) => event.event_type === 'Transfer');

    if (transferEvents.length === 0) {
      console.log('⚠️  No transfer events found at this block');
      return {
        entries: [],
        totalSupply: '0',
        totalSupplyFormatted: '0',
        holderCount: 0,
        splitMultiplier: 1,
        generatedAt: Date.now(),
        blockNumber,
      };
    }

    // Reconstruct balances from events
    const balanceMap = new Map<string, bigint>();

    for (const event of transferEvents) {
      const from = event.from_address?.toLowerCase();
      const to = event.to_address?.toLowerCase();
      const amount = BigInt(event.amount || '0');

      // Handle minting (from = null/zero address)
      if (!from || from === '0x0000000000000000000000000000000000000000' || from === ethers.ZeroAddress) {
        // Mint to recipient
        if (to) {
          const currentBalance = balanceMap.get(to) || BigInt(0);
          balanceMap.set(to, currentBalance + amount);
        }
      }
      // Handle burning (to = null/zero address)
      else if (!to || to === '0x0000000000000000000000000000000000000000' || to === ethers.ZeroAddress) {
        // Burn from sender
        const currentBalance = balanceMap.get(from) || BigInt(0);
        balanceMap.set(from, currentBalance - amount);
      }
      // Handle regular transfer
      else {
        // Subtract from sender
        const fromBalance = balanceMap.get(from) || BigInt(0);
        balanceMap.set(from, fromBalance - amount);

        // Add to recipient
        const toBalance = balanceMap.get(to) || BigInt(0);
        balanceMap.set(to, toBalance + amount);
      }
    }

    // Get split multiplier active at this block
    const splitEvents = allEvents.filter(
      (event) => event.event_type === 'StockSplit' && event.block_number <= blockNumber
    );

    let splitMultiplierBP = 10000; // Default: 10000 basis points = 1.0x
    if (splitEvents.length > 0) {
      // Get the most recent split event
      const latestSplit = splitEvents[splitEvents.length - 1];
      if (latestSplit.data) {
        try {
          const splitData = JSON.parse(latestSplit.data);
          // newSplitMultiplier is stored in basis points (e.g., 20000 for 2.0x)
          splitMultiplierBP = parseInt(splitData.newSplitMultiplier || '10000');
        } catch (error) {
          console.warn('Failed to parse split data:', error);
        }
      }
    }

    // Convert to decimal for metadata (10000 BP = 1.0x, 20000 BP = 2.0x)
    const splitMultiplier = splitMultiplierBP / 10000;

    // Filter out zero balances and convert to entries
    // Store RAW balances without applying split multiplier (frontend will apply it)
    const entries: CapTableEntry[] = [];
    let totalSupply = BigInt(0);

    for (const [address, balance] of balanceMap) {
      if (balance > 0) {
        totalSupply += balance;
        entries.push({
          address,
          balance: balance.toString(),
          balanceFormatted: ethers.formatEther(balance),
          ownershipPercentage: 0, // Will be calculated after we have total supply
          lastUpdated: undefined,
        });
      }
    }

    // Calculate ownership percentages
    for (const entry of entries) {
      const balanceBigInt = BigInt(entry.balance);
      entry.ownershipPercentage =
        totalSupply > 0 ? (Number(balanceBigInt) / Number(totalSupply)) * 100 : 0;
    }

    // Sort by balance descending
    entries.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      return balanceA > balanceB ? -1 : balanceA < balanceB ? 1 : 0;
    });

    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} tokens`);
    console.log(`   Split Multiplier: ${splitMultiplier}x`);
    console.log(`   Holders: ${entries.length}`);
    console.log(`   Events Processed: ${transferEvents.length}`);
    console.log('✅ Historical cap-table generated\n');

    return {
      entries,
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: ethers.formatEther(totalSupply),
      holderCount: entries.length,
      splitMultiplier,
      generatedAt: Date.now(),
      blockNumber,
    };
  }

  /**
   * Export cap-table to CSV
   *
   * @param capTable - Cap-table to export
   * @returns CSV string
   */
  exportToCSV(capTable: CapTable): string {
    console.log('📄 Exporting to CSV...');

    // CSV header
    let csv = 'Address,Balance,Ownership %,Last Updated\n';

    // Add rows
    for (const entry of capTable.entries) {
      const lastUpdated = entry.lastUpdated ? new Date(entry.lastUpdated).toISOString() : 'N/A';

      csv += `${entry.address},${entry.balanceFormatted},${entry.ownershipPercentage.toFixed(4)},${lastUpdated}\n`;
    }

    // Add summary footer
    csv += '\n';
    csv += `Total Supply,${capTable.totalSupplyFormatted},,\n`;
    csv += `Total Holders,${capTable.holderCount},,\n`;
    csv += `Split Multiplier,${capTable.splitMultiplier}x,,\n`;
    csv += `Generated At,${new Date(capTable.generatedAt).toISOString()},,\n`;

    console.log('✅ CSV export complete\n');
    return csv;
  }

  /**
   * Export cap-table to JSON
   *
   * @param capTable - Cap-table to export
   * @returns JSON string
   */
  exportToJSON(capTable: CapTable): string {
    console.log('📄 Exporting to JSON...');

    const json = JSON.stringify(
      {
        metadata: {
          totalSupply: capTable.totalSupplyFormatted,
          holderCount: capTable.holderCount,
          splitMultiplier: capTable.splitMultiplier,
          generatedAt: new Date(capTable.generatedAt).toISOString(),
          blockNumber: capTable.blockNumber,
        },
        holders: capTable.entries.map((entry) => ({
          address: entry.address,
          balance: entry.balanceFormatted,
          ownershipPercentage: entry.ownershipPercentage.toFixed(4) + '%',
          lastUpdated: entry.lastUpdated ? new Date(entry.lastUpdated).toISOString() : null,
        })),
      },
      null,
      2
    );

    console.log('✅ JSON export complete\n');
    return json;
  }

  /**
   * Get total holder count
   */
  getHolderCount(): number {
    const balances = this.db.getAllBalances();
    return balances.length;
  }

  /**
   * Get total supply (accounting for splits)
   */
  getTotalSupply(): string {
    const balances = this.db.getAllBalances();

    let totalSupply = BigInt(0);
    for (const balance of balances) {
      totalSupply += BigInt(balance.balance);
    }

    return ethers.formatEther(totalSupply);
  }

  /**
   * Get top holders
   *
   * @param limit - Number of top holders to return (default: 10)
   * @returns Top holders with their balances and ownership
   */
  getTopHolders(limit: number = 10): CapTableEntry[] {
    const capTable = this.generateCapTable();
    return capTable.entries.slice(0, limit);
  }

  /**
   * Get ownership distribution statistics
   */
  getOwnershipDistribution(): OwnershipDistribution {
    console.log('\n📈 Calculating Ownership Distribution...');

    const capTable = this.generateCapTable();

    if (capTable.entries.length === 0) {
      return {
        holderCount: 0,
        totalSupply: '0',
        medianHolding: '0',
        averageHolding: '0',
        topHoldersPercentage: 0,
        concentrationRatio: 0,
      };
    }

    // Calculate median holding
    const sortedBalances = [...capTable.entries].sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      return balanceA > balanceB ? 1 : balanceA < balanceB ? -1 : 0;
    });

    const midPoint = Math.floor(sortedBalances.length / 2);
    const medianHolding =
      sortedBalances.length % 2 === 0
        ? (BigInt(sortedBalances[midPoint - 1].balance) +
            BigInt(sortedBalances[midPoint].balance)) /
          BigInt(2)
        : BigInt(sortedBalances[midPoint].balance);

    // Calculate average holding
    const totalSupplyBigInt = BigInt(capTable.totalSupply);
    const averageHolding = totalSupplyBigInt / BigInt(capTable.entries.length);

    // Calculate top 10 holders percentage
    const top10 = capTable.entries.slice(0, 10);
    const top10Total = top10.reduce((sum, entry) => sum + BigInt(entry.balance), BigInt(0));
    const topHoldersPercentage =
      totalSupplyBigInt > 0 ? (Number(top10Total) / Number(totalSupplyBigInt)) * 100 : 0;

    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    let hhi = 0;
    for (const entry of capTable.entries) {
      const marketShare = entry.ownershipPercentage / 100;
      hhi += marketShare * marketShare;
    }

    console.log('   Holder Count:', capTable.holderCount);
    console.log('   Total Supply:', capTable.totalSupplyFormatted);
    console.log('   Median Holding:', ethers.formatEther(medianHolding));
    console.log('   Average Holding:', ethers.formatEther(averageHolding));
    console.log('   Top 10 Holders:', topHoldersPercentage.toFixed(2) + '%');
    console.log('   Concentration (HHI):', hhi.toFixed(4));
    console.log('✅ Distribution analysis complete\n');

    return {
      holderCount: capTable.holderCount,
      totalSupply: capTable.totalSupplyFormatted,
      medianHolding: ethers.formatEther(medianHolding),
      averageHolding: ethers.formatEther(averageHolding),
      topHoldersPercentage,
      concentrationRatio: hhi,
    };
  }

  /**
   * Get balance changes for an address over time
   *
   * @param address - Address to query
   * @param fromBlock - Start block (optional)
   * @param toBlock - End block (optional)
   * @returns Array of balance changes with running balances
   */
  getBalanceChanges(
    address: string,
    fromBlock?: number,
    toBlock?: number
  ): Array<{
    blockNumber: number;
    transactionHash: string;
    eventType: string;
    balanceChange: string;
    balanceChangeRaw: string;
    newBalance: string;
    direction: 'in' | 'out' | 'neutral';
    transactionType: 'Mint' | 'Transfer Received' | 'Transfer Sent' | 'Self Transfer';
    gasUsed?: string;
    gasPrice?: string;
    timestamp?: number;
  }> {
    console.log(`\n📊 Getting balance changes for ${address}...`);

    const addressLower = address.toLowerCase();

    // Get current split multiplier
    const splitMultiplierStr = this.db.getMetadata('split_multiplier');
    const splitMultiplierBP = splitMultiplierStr ? parseInt(splitMultiplierStr) : 10000;
    const splitMultiplier = BigInt(splitMultiplierBP);

    // Get all transfer events involving this address
    const allEvents = this.db.getEventsByType('Transfer');

    // Filter and sort events
    const filteredEvents = allEvents
      .filter((event) => {
        // Filter by address
        const isFrom = event.from_address?.toLowerCase() === addressLower;
        const isTo = event.to_address?.toLowerCase() === addressLower;

        if (!isFrom && !isTo) return false;

        // Filter by block range if specified
        if (fromBlock && event.block_number < fromBlock) return false;
        if (toBlock && event.block_number > toBlock) return false;

        return true;
      })
      .sort((a, b) => a.block_number - b.block_number);

    // Calculate running balance and process events
    let runningBalance = BigInt(0);
    const balanceChanges = filteredEvents.map((event) => {
      const isFrom = event.from_address?.toLowerCase() === addressLower;
      const isTo = event.to_address?.toLowerCase() === addressLower;
      const isMint =
        !event.from_address ||
        event.from_address === '0x0000000000000000000000000000000000000000' ||
        event.from_address === ethers.ZeroAddress;

      let balanceChange = BigInt(event.amount || '0');
      let direction: 'in' | 'out' | 'neutral' = 'neutral';
      let transactionType: 'Mint' | 'Transfer Received' | 'Transfer Sent' | 'Self Transfer';

      // Determine transaction type and direction
      if (isFrom && isTo) {
        // Self-transfer
        balanceChange = BigInt(0);
        direction = 'neutral';
        transactionType = 'Self Transfer';
      } else if (isFrom && !isTo) {
        // Outgoing transfer (sender)
        balanceChange = -balanceChange;
        direction = 'out';
        transactionType = 'Transfer Sent';
      } else if (isTo && !isFrom) {
        // Incoming transfer or mint
        direction = 'in';
        if (isMint) {
          transactionType = 'Mint';
        } else {
          transactionType = 'Transfer Received';
        }
      } else {
        // Default case (should not happen)
        transactionType = 'Transfer Received';
      }

      // Update running balance
      runningBalance += balanceChange;

      // Return raw values - frontend will apply current split multiplier
      return {
        blockNumber: event.block_number,
        transactionHash: event.transaction_hash,
        eventType: event.event_type,
        balanceChange: ethers.formatEther(balanceChange),
        balanceChangeRaw: balanceChange.toString(),
        newBalance: ethers.formatEther(runningBalance),
        newBalanceRaw: runningBalance.toString(),
        direction,
        transactionType,
        gasUsed: event.gas_used || undefined,
        gasPrice: event.gas_price || undefined,
        timestamp: event.timestamp || undefined,
      };
    });

    console.log(`   Found ${balanceChanges.length} balance changes`);
    console.log('✅ Balance changes retrieved\n');

    return balanceChanges;
  }

  /**
   * Export cap-table to file
   *
   * @param format - 'csv' or 'json'
   * @param filename - Output filename
   */
  exportToFile(format: 'csv' | 'json', filename: string): void {
    const capTable = this.generateCapTable();

    let content: string;
    if (format === 'csv') {
      content = this.exportToCSV(capTable);
    } else {
      content = this.exportToJSON(capTable);
    }

    const outputPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outputPath, content, 'utf8');

    console.log(`✅ Exported to: ${outputPath}\n`);
  }
}

/**
 * Create CapTableService instance
 */
export function createCapTableService(db?: ReturnType<typeof getDatabase>): CapTableService {
  return new CapTableService(db);
}
