/**
 * Cap-Table API Routes
 *
 * Handles cap-table generation, historical queries, and data exports
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createCapTableService } from '../services/captable.service.js';

const router = Router();

// Initialize cap-table service
const capTableService = createCapTableService();

/**
 * GET /api/captable
 * Get current cap-table
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capTable = capTableService.generateCapTable();

    res.status(200).json({
      success: true,
      data: capTable,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/captable/block/:blockNumber
 * Get cap-table at a specific block number
 * Note: Current implementation doesn't support historical queries yet
 */
router.get('/block/:blockNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { blockNumber } = req.params;

    const blockNum = parseInt(blockNumber);
    if (isNaN(blockNum) || blockNum < 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'blockNumber must be a non-negative integer',
      });
    }

    // For now, historical queries return current state with block number
    // TODO: Implement true historical state reconstruction
    const capTable = capTableService.generateCapTable(blockNum);

    res.status(200).json({
      success: true,
      data: capTable,
      warning: 'Historical block queries are not fully implemented. Returning current state.',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/captable/export
 * Export cap-table in CSV or JSON format
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.query;

    if (format !== 'csv' && format !== 'json') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'format must be either "csv" or "json"',
      });
    }

    const capTable = capTableService.generateCapTable();

    if (format === 'csv') {
      const csv = capTableService.exportToCSV(capTable);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="captable-${Date.now()}.csv"`);
      res.status(200).send(csv);
    } else {
      const json = capTableService.exportToJSON(capTable);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="captable-${Date.now()}.json"`);
      res.status(200).send(json);
    }
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/captable/holders
 * Get list of token holders with their balances
 */
router.get('/holders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '100' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a positive number between 1 and 1000',
      });
    }

    const capTable = capTableService.generateCapTable();
    const holders = capTable.entries.slice(0, limitNum);

    res.status(200).json({
      success: true,
      data: {
        holders,
        totalHolders: capTable.holderCount,
        returned: holders.length,
        limit: limitNum,
      },
    });
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
      res.status(400).json({
        error: 'Bad Request',
        message: 'Address parameter is required',
      });
    }

    const capTable = capTableService.generateCapTable();
    const holder = capTable.entries.find(
      (entry) => entry.address.toLowerCase() === address.toLowerCase()
    );

    if (!holder) {
      res.status(404).json({
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
  } catch (error: any) {
    next(error);
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
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a positive number between 1 and 100',
      });
    }

    const topHolders = capTableService.getTopHolders(limitNum);

    res.status(200).json({
      success: true,
      data: {
        topHolders,
        count: topHolders.length,
        limit: limitNum,
      },
    });
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
      success: true,
      data: {
        totalSupply: capTable.totalSupplyFormatted,
        holderCount: capTable.holderCount,
        splitMultiplier: capTable.splitMultiplier,
        generatedAt: new Date(capTable.generatedAt).toISOString(),
        distribution: {
          median: distribution.medianHolding,
          average: distribution.averageHolding,
          topHoldersPercentage: distribution.topHoldersPercentage,
          concentrationRatio: distribution.concentrationRatio,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
