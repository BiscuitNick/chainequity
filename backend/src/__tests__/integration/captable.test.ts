/**
 * Integration tests for Cap Table API
 */

import {
  createTestDatabase,
  cleanupTestDatabase,
  seedTestData,
  createTestApp,
} from '../testUtils.js';
import request from 'supertest';

// Create test database
const testDb = createTestDatabase();
const db = testDb.db;
const dbPath = testDb.dbPath;

// Seed test data
seedTestData(db);

// Create test app with test database
const app = createTestApp(db);

describe('Cap Table API Integration Tests', () => {
  afterAll(() => {
    // Clean up test database
    cleanupTestDatabase(dbPath);
  });

  describe('GET /api/captable', () => {
    it('should return cap table data with holders', async () => {
      const response = await request(app)
        .get('/api/captable')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('totalSupply');
      expect(response.body).toHaveProperty('splitMultiplier');
      expect(response.body).toHaveProperty('holders');
      expect(Array.isArray(response.body.holders)).toBe(true);
      expect(response.body.holders.length).toBeGreaterThan(0);
    });

    it('should apply limit parameter', async () => {
      const response = await request(app).get('/api/captable?limit=1').expect(200);

      expect(response.body.holders.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/captable/summary', () => {
    it('should return cap table summary statistics', async () => {
      const response = await request(app)
        .get('/api/captable/summary')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('holderCount');
      expect(response.body).toHaveProperty('totalSupply');
      expect(response.body).toHaveProperty('medianHolding');
      expect(response.body).toHaveProperty('averageHolding');
      expect(response.body).toHaveProperty('top10Concentration');
      expect(response.body).toHaveProperty('hhiIndex');
    });

    it('should return valid numeric values', async () => {
      const response = await request(app).get('/api/captable/summary').expect(200);

      expect(typeof response.body.holderCount).toBe('number');
      expect(typeof response.body.totalSupply).toBe('number');
      expect(typeof response.body.medianHolding).toBe('number');
      expect(typeof response.body.averageHolding).toBe('number');
    });
  });

  describe('GET /api/captable/holders', () => {
    it('should return list of token holders', async () => {
      const response = await request(app)
        .get('/api/captable/holders')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check holder structure
      const holder = response.body[0];
      expect(holder).toHaveProperty('address');
      expect(holder).toHaveProperty('balance');
      expect(holder).toHaveProperty('percentage');
    });

    it('should apply pagination', async () => {
      const response = await request(app).get('/api/captable/holders?limit=1').expect(200);

      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return holders sorted by balance descending', async () => {
      const response = await request(app).get('/api/captable/holders').expect(200);

      // Verify descending order
      for (let i = 1; i < response.body.length; i++) {
        const prevBalance = parseFloat(response.body[i - 1].balance);
        const currBalance = parseFloat(response.body[i].balance);
        expect(prevBalance).toBeGreaterThanOrEqual(currBalance);
      }
    });
  });

  describe('GET /api/captable/top/:count', () => {
    it('should return top N holders', async () => {
      const count = 2;
      const response = await request(app)
        .get(`/api/captable/top/${count}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(count);
    });

    it('should validate count parameter', async () => {
      await request(app).get('/api/captable/top/0').expect(400);

      await request(app).get('/api/captable/top/-1').expect(400);
    });

    it('should handle count larger than holder count', async () => {
      const response = await request(app).get('/api/captable/top/1000').expect(200);

      // Should return all holders, not error
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app).get('/api/captable?limit=invalid').expect(200);

      // Should use default limit and still return valid data
      expect(response.body).toHaveProperty('holders');
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/api/captable/nonexistent').expect(404);
    });
  });
});
