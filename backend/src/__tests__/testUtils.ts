/**
 * Test utilities for integration tests
 */

import { DatabaseService } from '../db/database.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createCaptableRouter } from '../api/captable.routes.js';
import { createAnalyticsRouter } from '../api/analytics.routes.js';
import { createCorporateRouter } from '../api/corporate.routes.js';
import { createIssuerRouter } from '../api/issuer.routes.js';
import { apiLimiter } from '../middleware/rateLimit.js';
import { errorHandler } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a test database with a unique name
 */
export function createTestDatabase(): { db: DatabaseService; dbPath: string } {
  const testDbPath = path.join(
    __dirname,
    `../../test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`
  );

  // Reset singleton to ensure clean state
  DatabaseService.resetInstance();

  // Ensure the database is created with schema
  const db = DatabaseService.getInstance(testDbPath);

  return { db, dbPath: testDbPath };
}

/**
 * Clean up test database
 */
export function cleanupTestDatabase(dbPath: string) {
  try {
    // Reset singleton first
    DatabaseService.resetInstance();

    // Delete the file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Also clean up WAL and SHM files
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  } catch (error) {
    console.error(`Error cleaning up test database ${dbPath}:`, error);
  }
}

/**
 * Seed test data into the database
 * Uses unique transaction hashes to avoid conflicts between test runs
 */
export function seedTestData(db: DatabaseService) {
  const timestamp = Math.floor(Date.now() / 1000);
  const uniqueId = Math.random().toString(36).substr(2, 9);

  // Insert test balances
  db.upsertBalance({
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    balance: '1000000000000000000000',
    last_updated_block: 1,
    last_updated_timestamp: timestamp,
  });

  db.upsertBalance({
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    balance: '500000000000000000000',
    last_updated_block: 1,
    last_updated_timestamp: timestamp,
  });

  // Insert test event with unique transaction hash
  db.insertEvent({
    block_number: 1,
    transaction_hash: `0x123abc${uniqueId}`,
    event_type: 'Transfer',
    from_address: '0x0000000000000000000000000000000000000000',
    to_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    amount: '1000000000000000000000',
    data: null,
    timestamp,
  });

  // Insert test corporate action with unique transaction hash
  db.insertCorporateAction({
    action_type: 'StockSplit',
    block_number: 2,
    transaction_hash: `0x456def${uniqueId}`,
    old_value: '10000',
    new_value: '20000',
    timestamp,
  });

  // Update metadata
  db.setMetadata('last_synced_block', '2');
  db.setMetadata('split_multiplier', '20000');
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a test Express app with test database
 */
export function createTestApp(db: DatabaseService) {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Apply rate limiting
  app.use('/api', apiLimiter);

  // API routes with test database
  app.use('/api/issuer', createIssuerRouter());
  app.use('/api/corporate', createCorporateRouter(db));
  app.use('/api/captable', createCaptableRouter(db));
  app.use('/api/analytics', createAnalyticsRouter(db));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'ChainEquity Backend API (Test)',
      version: '1.0.0',
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
