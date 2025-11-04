-- ChainEquity Database Schema
-- SQLite database for tracking token events, balances, and corporate actions

-- Events table: stores all blockchain events from the token contract
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_number INTEGER NOT NULL,
    transaction_hash TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    from_address TEXT,
    to_address TEXT,
    amount TEXT,
    data TEXT, -- JSON string for additional event data
    timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'Transfer',
        'WalletApproved',
        'WalletRevoked',
        'StockSplit',
        'SymbolChanged',
        'NameChanged',
        'TransferBlocked'
    ))
);

-- Index for efficient event queries
CREATE INDEX IF NOT EXISTS idx_events_block_number ON events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_from_address ON events(from_address);
CREATE INDEX IF NOT EXISTS idx_events_to_address ON events(to_address);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Balances table: maintains current balance state for all addresses
CREATE TABLE IF NOT EXISTS balances (
    address TEXT PRIMARY KEY NOT NULL,
    balance TEXT NOT NULL DEFAULT '0', -- Store as string to handle big numbers
    last_updated_block INTEGER NOT NULL,
    last_updated_timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for balance queries
CREATE INDEX IF NOT EXISTS idx_balances_updated ON balances(last_updated_block);

-- Corporate actions table: tracks symbol changes, stock splits, and other corporate events
CREATE TABLE IF NOT EXISTS corporate_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    block_number INTEGER NOT NULL,
    transaction_hash TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    CONSTRAINT chk_action_type CHECK (action_type IN (
        'StockSplit',
        'SymbolChange',
        'NameChange'
    ))
);

-- Index for corporate action queries
CREATE INDEX IF NOT EXISTS idx_corporate_actions_type ON corporate_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_block ON corporate_actions(block_number);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_timestamp ON corporate_actions(timestamp);

-- Metadata table: stores system configuration and sync state
CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Initialize metadata with default values
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_synced_block', '0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('contract_deployed_block', '0');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('split_multiplier', '1');
