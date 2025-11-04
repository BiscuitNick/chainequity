/**
 * Integration tests for Analytics API
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

describe('Analytics API Integration Tests', () => {
  afterAll(() => {
    // Clean up test database
    cleanupTestDatabase(dbPath);
  });

  describe('GET /api/analytics/overview', () => {
    it('should return analytics overview', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('totalSupply');
      expect(response.body).toHaveProperty('holderCount');
      expect(response.body).toHaveProperty('splitMultiplier');
      expect(response.body).toHaveProperty('recentActivity');
    });

    it('should include recent corporate actions', async () => {
      const response = await request(app).get('/api/analytics/overview').expect(200);

      expect(response.body).toHaveProperty('recentActivity');
      expect(Array.isArray(response.body.recentActivity)).toBe(true);
    });
  });

  describe('GET /api/analytics/holders', () => {
    it('should return holder analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/holders')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('holderCount');
      expect(response.body).toHaveProperty('top10Concentration');
      expect(response.body).toHaveProperty('hhiIndex');
      expect(response.body).toHaveProperty('topHolders');
    });

    it('should return valid concentration metrics', async () => {
      const response = await request(app).get('/api/analytics/holders').expect(200);

      expect(typeof response.body.holderCount).toBe('number');
      expect(typeof response.body.top10Concentration).toBe('number');
      expect(typeof response.body.hhiIndex).toBe('number');

      // Concentration should be between 0 and 100
      expect(response.body.top10Concentration).toBeGreaterThanOrEqual(0);
      expect(response.body.top10Concentration).toBeLessThanOrEqual(100);

      // HHI should be between 0 and 1
      expect(response.body.hhiIndex).toBeGreaterThanOrEqual(0);
      expect(response.body.hhiIndex).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/analytics/supply', () => {
    it('should return supply analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/supply')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('totalSupply');
      expect(response.body).toHaveProperty('splitMultiplier');
      expect(response.body).toHaveProperty('effectiveSupply');
    });

    it('should calculate effective supply correctly', async () => {
      const response = await request(app).get('/api/analytics/supply').expect(200);

      expect(typeof response.body.totalSupply).toBe('number');
      expect(typeof response.body.splitMultiplier).toBe('number');
      expect(typeof response.body.effectiveSupply).toBe('number');

      // Effective supply should be total supply adjusted for splits
      const expectedEffective = response.body.totalSupply * (response.body.splitMultiplier / 10000);
      expect(response.body.effectiveSupply).toBeCloseTo(expectedEffective, 2);
    });
  });

  describe('GET /api/analytics/distribution', () => {
    it('should return distribution analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/distribution')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('holderCount');
      expect(response.body).toHaveProperty('medianHolding');
      expect(response.body).toHaveProperty('averageHolding');
      expect(response.body).toHaveProperty('concentrationRatio');
      expect(response.body).toHaveProperty('giniCoefficient');
      expect(response.body).toHaveProperty('decentralizationScore');
    });

    it('should return valid distribution metrics', async () => {
      const response = await request(app).get('/api/analytics/distribution').expect(200);

      // Gini coefficient should be between 0 and 1
      expect(response.body.giniCoefficient).toBeGreaterThanOrEqual(0);
      expect(response.body.giniCoefficient).toBeLessThanOrEqual(1);

      // Decentralization score should be between 0 and 100
      expect(response.body.decentralizationScore).toBeGreaterThanOrEqual(0);
      expect(response.body.decentralizationScore).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/analytics/events', () => {
    it('should return recent events', async () => {
      const response = await request(app)
        .get('/api/analytics/events')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should apply limit parameter', async () => {
      const limit = 1;
      const response = await request(app).get(`/api/analytics/events?limit=${limit}`).expect(200);

      expect(response.body.length).toBeLessThanOrEqual(limit);
    });

    it('should support offset parameter', async () => {
      const offset = 1;
      const response = await request(app).get(`/api/analytics/events?offset=${offset}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return events with required fields', async () => {
      const response = await request(app).get('/api/analytics/events?limit=1').expect(200);

      if (response.body.length > 0) {
        const event = response.body[0];
        expect(event).toHaveProperty('block_number');
        expect(event).toHaveProperty('transaction_hash');
        expect(event).toHaveProperty('event_type');
        expect(event).toHaveProperty('timestamp');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit parameters', async () => {
      const response = await request(app).get('/api/analytics/events?limit=invalid').expect(200);

      // Should use default limit
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app).get('/api/analytics/nonexistent').expect(404);
    });
  });
});
