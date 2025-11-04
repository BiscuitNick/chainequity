/**
 * Integration tests for Corporate Actions API
 */

import { createTestDatabase, cleanupTestDatabase, seedTestData } from '../testUtils.js';
import { DatabaseService as _DatabaseService } from '../../db/database.js';

// Create test database BEFORE importing app
const testDb = createTestDatabase();
const db = testDb.db;
const dbPath = testDb.dbPath;

// Set environment to use test database BEFORE importing app
process.env.DATABASE_PATH = dbPath;

// Seed test data
seedTestData(db);

// NOW import the app after database is set up
import request from 'supertest';
import { app } from '../../server.js';

describe('Corporate Actions API Integration Tests', () => {
  afterAll(() => {
    // Clean up test database
    cleanupTestDatabase(dbPath);
  });

  describe('GET /api/corporate/history', () => {
    it('should return corporate action history', async () => {
      const response = await request(app)
        .get('/api/corporate/history')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return actions sorted by block number descending', async () => {
      const response = await request(app).get('/api/corporate/history').expect(200);

      // Verify descending order
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].block_number).toBeGreaterThanOrEqual(
          response.body[i].block_number
        );
      }
    });

    it('should apply limit parameter', async () => {
      const limit = 5;
      const response = await request(app).get(`/api/corporate/history?limit=${limit}`).expect(200);

      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('should return actions with required fields', async () => {
      const response = await request(app).get('/api/corporate/history?limit=1').expect(200);

      if (response.body.length > 0) {
        const action = response.body[0];
        expect(action).toHaveProperty('action_type');
        expect(action).toHaveProperty('block_number');
        expect(action).toHaveProperty('transaction_hash');
        expect(action).toHaveProperty('timestamp');
      }
    });
  });

  describe('GET /api/corporate/splits', () => {
    it('should return stock split history', async () => {
      const response = await request(app)
        .get('/api/corporate/splits')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should only return StockSplit events', async () => {
      const response = await request(app).get('/api/corporate/splits').expect(200);

      response.body.forEach((action: any) => {
        expect(action.action_type).toBe('StockSplit');
      });
    });

    it('should apply limit parameter', async () => {
      const limit = 2;
      const response = await request(app).get(`/api/corporate/splits?limit=${limit}`).expect(200);

      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('should include old_value and new_value for splits', async () => {
      const response = await request(app).get('/api/corporate/splits?limit=1').expect(200);

      if (response.body.length > 0) {
        const split = response.body[0];
        expect(split).toHaveProperty('old_value');
        expect(split).toHaveProperty('new_value');
        expect(split.action_type).toBe('StockSplit');
      }
    });
  });

  describe('GET /api/corporate/symbols', () => {
    it('should return symbol change history', async () => {
      const response = await request(app)
        .get('/api/corporate/symbols')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should only return SymbolChange events', async () => {
      // First add a symbol change to test data
      const uniqueId = Math.random().toString(36).substr(2, 9);
      db.insertCorporateAction({
        action_type: 'SymbolChange',
        block_number: 3,
        transaction_hash: `0x789ghi${uniqueId}`,
        old_value: 'CEQT',
        new_value: 'CET',
        timestamp: Math.floor(Date.now() / 1000),
      });

      const response = await request(app).get('/api/corporate/symbols').expect(200);

      response.body.forEach((action: any) => {
        expect(action.action_type).toBe('SymbolChange');
      });
    });

    it('should apply limit parameter', async () => {
      const limit = 1;
      const response = await request(app).get(`/api/corporate/symbols?limit=${limit}`).expect(200);

      expect(response.body.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('GET /api/corporate/names', () => {
    it('should return name change history', async () => {
      const response = await request(app)
        .get('/api/corporate/names')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should only return NameChange events', async () => {
      // First add a name change to test data
      const uniqueId = Math.random().toString(36).substr(2, 9);
      db.insertCorporateAction({
        action_type: 'NameChange',
        block_number: 4,
        transaction_hash: `0xabcjkl${uniqueId}`,
        old_value: 'ChainEquity Token',
        new_value: 'Chain Equity',
        timestamp: Math.floor(Date.now() / 1000),
      });

      const response = await request(app).get('/api/corporate/names').expect(200);

      response.body.forEach((action: any) => {
        expect(action.action_type).toBe('NameChange');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameters gracefully', async () => {
      const response = await request(app).get('/api/corporate/history?limit=invalid').expect(200);

      // Should use default limit and still return valid data
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle negative limit values', async () => {
      const response = await request(app).get('/api/corporate/history?limit=-5').expect(200);

      // Should use default limit
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/api/corporate/nonexistent').expect(404);
    });
  });
});
