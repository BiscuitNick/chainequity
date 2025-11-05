/**
 * Cap-Table API Routes
 *
 * Handles cap-table generation, historical queries, and data exports
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createCapTableService } from '../services/captable.service.js';
import { getDatabase } from '../db/database.js';

/**
 * Create captable router with optional database instance
 */
export function createCaptableRouter(db?: ReturnType<typeof getDatabase>) {
  const router = Router();
  const capTableService = createCapTableService(db);

  /**
   * GET /api/captable
   * Get current cap-table or historical snapshot at specific block
   * Query params:
   *   - block: (optional) Block number for historical snapshot
   *   - limit: (optional) Limit number of holders returned
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit, block } = req.query;

      // Parse and validate block number if provided
      let blockNumber: number | undefined;
      if (block) {
        blockNumber = parseInt(block as string);
        if (isNaN(blockNumber) || blockNumber < 0) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'block must be a non-negative integer',
          });
        }
      }

      // Generate cap-table (current or historical)
      const capTable = capTableService.generateCapTable(blockNumber);

      // Apply limit if provided
      let holders = capTable.entries;
      if (limit) {
        let limitNum = parseInt(limit as string);
        if (isNaN(limitNum) || limitNum <= 0) {
          limitNum = capTable.entries.length; // Use all holders for invalid limit
        }
        holders = capTable.entries.slice(0, limitNum);
      }

      // Format response to match test expectations (rename 'entries' to 'holders')
      res.status(200).json({
        totalSupply: capTable.totalSupply,
        totalSupplyFormatted: capTable.totalSupplyFormatted,
        holderCount: capTable.holderCount,
        splitMultiplier: capTable.splitMultiplier,
        generatedAt: capTable.generatedAt,
        blockNumber: capTable.blockNumber,
        isHistorical: blockNumber !== undefined,
        holders: holders,
      });
      return;
    } catch (error: any) {
      next(error);
      return;
    }
  });

  /**
   * GET /api/captable/block/:blockNumber
   * Get cap-table at a specific block number (historical snapshot)
   */
  router.get('/block/:blockNumber', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { blockNumber } = req.params;

      const blockNum = parseInt(blockNumber);
      if (isNaN(blockNum) || blockNum < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'blockNumber must be a non-negative integer',
        });
      }

      // Generate historical snapshot
      const capTable = capTableService.generateCapTable(blockNum);

      // Format response to match standard captable response
      res.status(200).json({
        totalSupply: capTable.totalSupply,
        totalSupplyFormatted: capTable.totalSupplyFormatted,
        holderCount: capTable.holderCount,
        splitMultiplier: capTable.splitMultiplier,
        generatedAt: capTable.generatedAt,
        blockNumber: capTable.blockNumber,
        isHistorical: true,
        holders: capTable.entries,
      });
      return;
    } catch (error: any) {
      next(error);
      return;
    }
  });

  /**
   * GET /api/captable/export
   * Export cap-table in CSV or JSON format
   * Query params:
   *   - format: (optional) Export format, either 'csv' or 'json' (default: 'json')
   *   - block: (optional) Block number for historical snapshot export
   */
  router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { format = 'json', block } = req.query;

      if (format !== 'csv' && format !== 'json') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'format must be either "csv" or "json"',
        });
      }

      // Parse and validate block number if provided
      let blockNumber: number | undefined;
      if (block) {
        blockNumber = parseInt(block as string);
        if (isNaN(blockNumber) || blockNumber < 0) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'block must be a non-negative integer',
          });
        }
      }

      // Generate cap-table (current or historical)
      const capTable = capTableService.generateCapTable(blockNumber);

      // Create filename with block number if historical
      const blockSuffix = blockNumber !== undefined ? `-block-${blockNumber}` : '';
      const timestamp = Date.now();

      if (format === 'csv') {
        const csv = capTableService.exportToCSV(capTable);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="captable${blockSuffix}-${timestamp}.csv"`
        );
        res.status(200).send(csv);
      } else {
        const json = capTableService.exportToJSON(capTable);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="captable${blockSuffix}-${timestamp}.json"`
        );
        res.status(200).send(json);
      }
      return;
    } catch (error: any) {
      next(error);
      return;
    }
  });

  /**
   * GET /api/captable/holders
   * Get list of token holders with their balances
   */
  router.get('/holders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '100' } = req.query;

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
        limitNum = 100; // Use default limit for invalid values
      }

      const capTable = capTableService.generateCapTable();
      const holders = capTable.entries.slice(0, limitNum).map((entry) => ({
        address: entry.address,
        balance: entry.balanceFormatted,
        percentage: entry.ownershipPercentage,
      }));

      res.status(200).json(holders);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/captable/holder/:address
   * Get cap-table information for a specific holder
   */
  router.get('/holder/:address', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Address parameter is required',
        });
      }

      const capTable = capTableService.generateCapTable();
      const holder = capTable.entries.find(
        (entry) => entry.address.toLowerCase() === address.toLowerCase()
      );

      if (!holder) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Holder not found in cap-table',
          data: {
            address,
            balance: '0',
            ownershipPercentage: 0,
          },
        });
      }

      // Get balance change history
      const balanceChanges = capTableService.getBalanceChanges(address);

      res.status(200).json({
        success: true,
        data: {
          ...holder,
          balanceHistory: balanceChanges,
          historyCount: balanceChanges.length,
        },
      });
      return;
    } catch (error: any) {
      next(error);
      return;
    }
  });

  /**
   * GET /api/captable/top/:limit
   * Get top N holders
   */
  router.get('/top/:limit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.params;

      const limitNum = parseInt(limit);
      // Path params should validate strictly (return 400 for invalid)
      if (isNaN(limitNum) || limitNum <= 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'limit must be a positive number',
        });
        return;
      }

      const topHolders = capTableService.getTopHolders(limitNum);

      // Format holders for response
      const formattedHolders = topHolders.map((holder) => ({
        address: holder.address,
        balance: holder.balanceFormatted,
        percentage: holder.ownershipPercentage,
      }));

      res.status(200).json(formattedHolders);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/captable/summary
   * Get cap-table summary statistics
   */
  router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const capTable = capTableService.generateCapTable();

      // Calculate summary statistics
      const distribution = capTableService.getOwnershipDistribution();

      res.status(200).json({
        holderCount: capTable.holderCount,
        totalSupply: parseFloat(capTable.totalSupplyFormatted),
        medianHolding: parseFloat(distribution.medianHolding),
        averageHolding: parseFloat(distribution.averageHolding),
        top10Concentration: distribution.topHoldersPercentage,
        hhiIndex: distribution.concentrationRatio,
        splitMultiplier: capTable.splitMultiplier,
        generatedAt: new Date(capTable.generatedAt).toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}

// Export default router for backwards compatibility
export default createCaptableRouter();
