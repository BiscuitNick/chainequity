/**
 * Database service layer using Better-SQLite3
 * Implements singleton pattern for connection management
 */
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Get the project root (go up from backend/src/db/)
const PROJECT_ROOT = resolve(__dirname, '../../..');
const DEFAULT_DB_PATH = join(PROJECT_ROOT, 'backend/data/chainequity.db');
export class DatabaseService {
    static instance;
    db;
    constructor(dbPath) {
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
    static getInstance(dbPath = DEFAULT_DB_PATH) {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService(dbPath);
        }
        return DatabaseService.instance;
    }
    /**
     * Reset the singleton instance (for testing only)
     */
    static resetInstance() {
        if (DatabaseService.instance) {
            try {
                DatabaseService.instance.close();
            }
            catch {
                // Ignore errors when closing
            }
            DatabaseService.instance = null;
        }
    }
    /**
     * Initialize database schema
     */
    initialize() {
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
    insertEvent(event) {
        const stmt = this.db.prepare(`
      INSERT INTO events (
        block_number, transaction_hash, event_type,
        from_address, to_address, amount, data, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(event.block_number, event.transaction_hash, event.event_type, event.from_address || null, event.to_address || null, event.amount || null, event.data || null, event.timestamp);
    }
    /**
     * Get event by transaction hash
     */
    getEventByTxHash(txHash) {
        const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE transaction_hash = ?
      LIMIT 1
    `);
        return stmt.get(txHash);
    }
    /**
     * Get events by type
     */
    getEventsByType(eventType, limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE event_type = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);
        return stmt.all(eventType, limit);
    }
    /**
     * Get events in a block range
     */
    getEventsByBlockRange(fromBlock, toBlock) {
        const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE block_number BETWEEN ? AND ?
      ORDER BY block_number ASC, id ASC
    `);
        return stmt.all(fromBlock, toBlock);
    }
    /**
     * Get events for a specific address
     */
    getEventsByAddress(address, limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE from_address = ? OR to_address = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);
        return stmt.all(address, address, limit);
    }
    /**
     * Get all events with pagination
     */
    getAllEvents(limit = 100, offset = 0) {
        const stmt = this.db.prepare(`
      SELECT * FROM events
      ORDER BY block_number DESC, id DESC
      LIMIT ? OFFSET ?
    `);
        return stmt.all(limit, offset);
    }
    // ============================================
    // Balance Operations
    // ============================================
    /**
     * Update or insert balance for an address
     */
    upsertBalance(balance) {
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
        stmt.run(balance.address, balance.balance, balance.last_updated_block, balance.last_updated_timestamp);
    }
    /**
     * Get balance for a specific address
     */
    getBalance(address) {
        const stmt = this.db.prepare(`
      SELECT * FROM balances WHERE address = ?
    `);
        return stmt.get(address);
    }
    /**
     * Get all balances with non-zero amounts
     */
    getAllBalances(limit = 1000) {
        const stmt = this.db.prepare(`
      SELECT * FROM balances
      WHERE CAST(balance AS REAL) > 0
      ORDER BY CAST(balance AS REAL) DESC
      LIMIT ?
    `);
        return stmt.all(limit);
    }
    /**
     * Get total number of holders
     */
    getHolderCount() {
        const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM balances
      WHERE CAST(balance AS REAL) > 0
    `);
        const result = stmt.get();
        return result.count;
    }
    // ============================================
    // Corporate Action Operations
    // ============================================
    /**
     * Insert a new corporate action
     */
    insertCorporateAction(action) {
        const stmt = this.db.prepare(`
      INSERT INTO corporate_actions (
        action_type, block_number, transaction_hash,
        old_value, new_value, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(action.action_type, action.block_number, action.transaction_hash, action.old_value || null, action.new_value || null, action.timestamp);
    }
    /**
     * Get corporate actions by type
     */
    getCorporateActionsByType(actionType, limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM corporate_actions
      WHERE action_type = ?
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);
        return stmt.all(actionType, limit);
    }
    /**
     * Get all corporate actions
     */
    getAllCorporateActions(limit = 100) {
        const stmt = this.db.prepare(`
      SELECT * FROM corporate_actions
      ORDER BY block_number DESC, id DESC
      LIMIT ?
    `);
        return stmt.all(limit);
    }
    // ============================================
    // Metadata Operations
    // ============================================
    /**
     * Get metadata value by key
     */
    getMetadata(key) {
        const stmt = this.db.prepare(`
      SELECT value FROM metadata WHERE key = ?
    `);
        const result = stmt.get(key);
        return result?.value;
    }
    /**
     * Set metadata value
     */
    setMetadata(key, value) {
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
    transaction(fn) {
        const transaction = this.db.transaction(fn);
        return transaction();
    }
    /**
     * Begin a manual transaction
     */
    begin() {
        this.db.exec('BEGIN');
    }
    /**
     * Commit a manual transaction
     */
    commit() {
        this.db.exec('COMMIT');
    }
    /**
     * Rollback a manual transaction
     */
    rollback() {
        this.db.exec('ROLLBACK');
    }
    // ============================================
    // Utility Methods
    // ============================================
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
    /**
     * Get the underlying database instance
     */
    getDb() {
        return this.db;
    }
    /**
     * Execute a raw SQL query (use with caution)
     */
    exec(sql) {
        this.db.exec(sql);
    }
}
// Export singleton instance getter
export const getDatabase = (dbPath) => DatabaseService.getInstance(dbPath);
