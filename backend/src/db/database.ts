/**
 * Database service layer using Better-SQLite3
 * Implements singleton pattern for connection management
 */

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type {
  Event,
  Balance,
  CorporateAction,
  Metadata,
  EventType,
  CorporateActionType,
} from '../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the project root (go up from backend/src/db/)
const PROJECT_ROOT = resolve(__dirname, '../../..');
const DEFAULT_DB_PATH = join(PROJECT_ROOT, 'backend/data/chainequity.db');

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor(dbPath: string) {
    // Ensure the directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath, { verbose: console.log });
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  public static getInstance(dbPath: string = DEFAULT_DB_PATH): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(dbPath);
    }
    return DatabaseService.instance;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    if (DatabaseService.instance) {
      try {
        DatabaseService.instance.close();
      } catch {
        // Ignore errors when closing
      }
      DatabaseService.instance = null as any;
    }
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema in a transaction
    this.db.exec(schema);
    console.log('Database schema initialized successfully');
  }

  // ============================================
  // Event Operations
  // ============================================

  /**
   * Insert a new event into the database
   */
  public insertEvent(event: Omit<Event, 'id' | 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (
        block_number, transaction_hash, event_type,
        from_address, to_address, amount, data,
        gas_used, gas_price, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.block_number,
      event.transaction_hash,
      event.event_type,
      event.from_address || null,
      event.to_address || null,
      event.amount || null,
      event.data || null,
      event.gas_used || null,
      event.gas_price || null,
      event.timestamp
    );
  }

  /**
   * Get event by transaction hash
   */
  public getEventByTxHash(txHash: string): Event | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE transaction_hash = ?
      LIMIT 1
    `);

    return stmt.get(txHash) as Event | undefined;
  }

  /**
   * Get events by type
   */
  public getEventsByType(eventType: EventType, limit: number = 100): Event[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE event_type = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);

    return stmt.all(eventType, limit) as Event[];
  }

  /**
   * Get events in a block range
   */
  public getEventsByBlockRange(fromBlock: number, toBlock: number): Event[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE block_number BETWEEN ? AND ?
      ORDER BY block_number ASC, id ASC
    `);

    return stmt.all(fromBlock, toBlock) as Event[];
  }

  /**
   * Get events for a specific address
   */
  public getEventsByAddress(address: string, limit: number = 100): Event[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE from_address = ? OR to_address = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);

    return stmt.all(address, address, limit) as Event[];
  }

  /**
   * Get all events with pagination
   */
  public getAllEvents(limit: number = 100, offset: number = 0): Event[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      ORDER BY block_number DESC, id DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as Event[];
  }

  // ============================================
  // Balance Operations
  // ============================================

  /**
   * Update or insert balance for an address
   */
  public upsertBalance(balance: Omit<Balance, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO balances (
        address, balance, last_updated_block, last_updated_timestamp
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        balance = excluded.balance,
        last_updated_block = excluded.last_updated_block,
        last_updated_timestamp = excluded.last_updated_timestamp,
        updated_at = strftime('%s', 'now')
    `);

    stmt.run(
      balance.address,
      balance.balance,
      balance.last_updated_block,
      balance.last_updated_timestamp
    );
  }

  /**
   * Get balance for a specific address
   */
  public getBalance(address: string): Balance | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM balances WHERE address = ?
    `);

    return stmt.get(address) as Balance | undefined;
  }

  /**
   * Get all balances with non-zero amounts
   */
  public getAllBalances(limit: number = 1000): Balance[] {
    const stmt = this.db.prepare(`
      SELECT * FROM balances
      WHERE CAST(balance AS REAL) > 0
      ORDER BY CAST(balance AS REAL) DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Balance[];
  }

  /**
   * Get total number of holders
   */
  public getHolderCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM balances
      WHERE CAST(balance AS REAL) > 0
    `);

    const result = stmt.get() as { count: number };
    return result.count;
  }

  // ============================================
  // Corporate Action Operations
  // ============================================

  /**
   * Insert a new corporate action
   */
  public insertCorporateAction(action: Omit<CorporateAction, 'id' | 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO corporate_actions (
        action_type, block_number, transaction_hash,
        old_value, new_value, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      action.action_type,
      action.block_number,
      action.transaction_hash,
      action.old_value || null,
      action.new_value || null,
      action.timestamp
    );
  }

  /**
   * Get corporate actions by type
   */
  public getCorporateActionsByType(
    actionType: CorporateActionType,
    limit: number = 100
  ): CorporateAction[] {
    const stmt = this.db.prepare(`
      SELECT * FROM corporate_actions
      WHERE action_type = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);

    return stmt.all(actionType, limit) as CorporateAction[];
  }

  /**
   * Get all corporate actions
   */
  public getAllCorporateActions(limit: number = 100): CorporateAction[] {
    const stmt = this.db.prepare(`
      SELECT * FROM corporate_actions
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);

    return stmt.all(limit) as CorporateAction[];
  }

  // ============================================
  // Metadata Operations
  // ============================================

  /**
   * Get metadata value by key
   */
  public getMetadata(key: string): string | undefined {
    const stmt = this.db.prepare(`
      SELECT value FROM metadata WHERE key = ?
    `);

    const result = stmt.get(key) as Metadata | undefined;
    return result?.value;
  }

  /**
   * Set metadata value
   */
  public setMetadata(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime('%s', 'now')
    `);

    stmt.run(key, value);
  }

  // ============================================
  // Transaction Support
  // ============================================

  /**
   * Execute multiple operations in a transaction
   */
  public transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * Begin a manual transaction
   */
  public begin(): void {
    this.db.exec('BEGIN');
  }

  /**
   * Commit a manual transaction
   */
  public commit(): void {
    this.db.exec('COMMIT');
  }

  /**
   * Rollback a manual transaction
   */
  public rollback(): void {
    this.db.exec('ROLLBACK');
  }

  // ============================================
  // Gas Analytics Methods
  // ============================================

  /**
   * Get gas statistics for all events
   */
  public getGasStatistics(): {
    totalGasUsed: string;
    averageGasUsed: string;
    totalCost: string;
    eventCount: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        SUM(CAST(gas_used AS INTEGER)) as total_gas,
        AVG(CAST(gas_used AS INTEGER)) as avg_gas,
        SUM(CAST(gas_used AS INTEGER) * CAST(gas_price AS INTEGER)) as total_cost,
        COUNT(*) as event_count
      FROM events
      WHERE gas_used IS NOT NULL AND gas_price IS NOT NULL
    `);

    const result = stmt.get() as any;

    return {
      totalGasUsed: result?.total_gas?.toString() || '0',
      averageGasUsed: result?.avg_gas?.toString() || '0',
      totalCost: result?.total_cost?.toString() || '0',
      eventCount: result?.event_count || 0,
    };
  }

  /**
   * Get gas statistics by event type
   */
  public getGasStatisticsByType(): Array<{
    eventType: string;
    count: number;
    minGas: string;
    maxGas: string;
    avgGas: string;
    totalGas: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        event_type,
        COUNT(*) as count,
        MIN(CAST(gas_used AS INTEGER)) as min_gas,
        MAX(CAST(gas_used AS INTEGER)) as max_gas,
        AVG(CAST(gas_used AS INTEGER)) as avg_gas,
        SUM(CAST(gas_used AS INTEGER)) as total_gas
      FROM events
      WHERE gas_used IS NOT NULL
      GROUP BY event_type
      ORDER BY avg_gas DESC
    `);

    const results = stmt.all() as any[];

    return results.map((row) => ({
      eventType: row.event_type,
      count: row.count,
      minGas: row.min_gas?.toString() || '0',
      maxGas: row.max_gas?.toString() || '0',
      avgGas: Math.round(row.avg_gas || 0).toString(),
      totalGas: row.total_gas?.toString() || '0',
    }));
  }

  /**
   * Get most expensive transactions
   */
  public getMostExpensiveTransactions(limit: number = 10): Array<{
    transactionHash: string;
    eventType: string;
    gasUsed: string;
    gasPrice: string;
    cost: string;
    blockNumber: number;
    timestamp: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        transaction_hash,
        event_type,
        gas_used,
        gas_price,
        (CAST(gas_used AS INTEGER) * CAST(gas_price AS INTEGER)) as cost,
        block_number,
        timestamp
      FROM events
      WHERE gas_used IS NOT NULL AND gas_price IS NOT NULL
      ORDER BY cost DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as any[];

    return results.map((row) => ({
      transactionHash: row.transaction_hash,
      eventType: row.event_type,
      gasUsed: row.gas_used,
      gasPrice: row.gas_price,
      cost: row.cost?.toString() || '0',
      blockNumber: row.block_number,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Get gas trends over time (by day)
   */
  public getGasTrendsByDay(days: number = 7): Array<{
    date: string;
    eventCount: number;
    totalGas: string;
    avgGas: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        DATE(timestamp, 'unixepoch') as date,
        COUNT(*) as event_count,
        SUM(CAST(gas_used AS INTEGER)) as total_gas,
        AVG(CAST(gas_used AS INTEGER)) as avg_gas
      FROM events
      WHERE gas_used IS NOT NULL
        AND timestamp >= strftime('%s', 'now', '-${days} days')
      GROUP BY DATE(timestamp, 'unixepoch')
      ORDER BY date DESC
    `);

    const results = stmt.all() as any[];

    return results.map((row) => ({
      date: row.date,
      eventCount: row.event_count,
      totalGas: row.total_gas?.toString() || '0',
      avgGas: Math.round(row.avg_gas || 0).toString(),
    }));
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Get the underlying database instance
   */
  public getDb(): Database.Database {
    return this.db;
  }

  /**
   * Execute a raw SQL query (use with caution)
   */
  public exec(sql: string): void {
    this.db.exec(sql);
  }
}

// Export singleton instance getter
export const getDatabase = (dbPath?: string) => DatabaseService.getInstance(dbPath);
