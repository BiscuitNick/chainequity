/**
 * Database service layer using Better-SQLite3
 * Implements singleton pattern for connection management
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
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

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor(dbPath: string) {
    this.db = new Database(dbPath, { verbose: console.log });
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  public static getInstance(dbPath: string = './data/chainequity.db'): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService(dbPath);
    }
    return DatabaseService.instance;
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
        from_address, to_address, amount, data, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.block_number,
      event.transaction_hash,
      event.event_type,
      event.from_address || null,
      event.to_address || null,
      event.amount || null,
      event.data || null,
      event.timestamp
    );
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
  public insertCorporateAction(
    action: Omit<CorporateAction, 'id' | 'created_at'>
  ): void {
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
