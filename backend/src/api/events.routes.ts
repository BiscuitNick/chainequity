/**
 * Events API Routes
 *
 * Provides endpoints for querying blockchain events
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/database.js';
import type { EventType } from '../types/database.js';

/**
 * Create events router with optional database instance
 */
export function createEventsRouter(db?: ReturnType<typeof getDatabase>) {
  const router = Router();
  const database = db || getDatabase();

  /**
   * GET /api/events
   * Get all events with pagination
   * Query params:
   *   - limit: number of events to return (default: 10, max: 500)
   *   - offset: number of events to skip (default: 0)
   *   - eventType: filter by event type (optional)
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '10', offset = '0', eventType } = req.query;

      // Validate and parse limit
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 10;
      }

      // Validate and parse offset
      let offsetNum = parseInt(offset as string);
      if (isNaN(offsetNum) || offsetNum < 0) {
        offsetNum = 0;
      }

      let events;
      if (eventType && typeof eventType === 'string') {
        // Validate event type
        const validEventTypes: EventType[] = [
          'Transfer',
          'WalletApproved',
          'WalletRevoked',
          'StockSplit',
          'SymbolChanged',
          'NameChanged',
          'TransferBlocked',
        ];
        if (!validEventTypes.includes(eventType as EventType)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Invalid event type. Valid types: ${validEventTypes.join(', ')}`,
          });
          return;
        }

        events = database.getEventsByType(eventType as EventType, limitNum);
      } else {
        events = database.getAllEvents(limitNum, offsetNum);
      }

      res.status(200).json({
        events,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          count: events.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/events/transfers
   * Get transfer events with pagination
   * Query params:
   *   - limit: number of events to return (default: 10, max: 500)
   */
  router.get('/transfers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '10' } = req.query;

      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 10;
      }

      const events = database.getEventsByType('Transfer', limitNum);

      res.status(200).json({
        events,
        pagination: {
          limit: limitNum,
          count: events.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/events/wallet-approvals
   * Get wallet approval and revocation events
   * Query params:
   *   - limit: number of events to return (default: 10, max: 500)
   */
  router.get('/wallet-approvals', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '10' } = req.query;

      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 10;
      }

      // Get both approval and revocation events
      const approvals = database.getEventsByType('WalletApproved', Math.ceil(limitNum / 2));
      const revocations = database.getEventsByType('WalletRevoked', Math.ceil(limitNum / 2));

      // Combine and sort by block number descending
      const events = [...approvals, ...revocations]
        .sort((a, b) => b.block_number - a.block_number)
        .slice(0, limitNum);

      res.status(200).json({
        events,
        pagination: {
          limit: limitNum,
          count: events.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/events/corporate
   * Get corporate action events (splits, symbol/name changes)
   * Query params:
   *   - limit: number of events to return (default: 10, max: 500)
   */
  router.get('/corporate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '10' } = req.query;

      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 10;
      }

      // Get corporate action events
      const splits = database.getEventsByType('StockSplit', Math.ceil(limitNum / 3));
      const symbolChanges = database.getEventsByType('SymbolChanged', Math.ceil(limitNum / 3));
      const nameChanges = database.getEventsByType('NameChanged', Math.ceil(limitNum / 3));

      // Combine and sort by block number descending
      const events = [...splits, ...symbolChanges, ...nameChanges]
        .sort((a, b) => b.block_number - a.block_number)
        .slice(0, limitNum);

      res.status(200).json({
        events,
        pagination: {
          limit: limitNum,
          count: events.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/events/address/:address
   * Get events for a specific address
   * Query params:
   *   - limit: number of events to return (default: 10, max: 500)
   */
  router.get('/address/:address', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;
      const { limit = '10' } = req.query;

      // Basic address validation
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid Ethereum address',
        });
        return;
      }

      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 10;
      }

      const events = database.getEventsByAddress(address, limitNum);

      res.status(200).json({
        events,
        pagination: {
          limit: limitNum,
          count: events.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// Export default router instance
export default createEventsRouter();
