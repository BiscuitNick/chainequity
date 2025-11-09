/**
 * Analytics API Routes
 *
 * Provides analytics endpoints for holder statistics, supply metrics, and distribution analysis
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createCapTableService } from '../services/captable.service.js';
import { getDatabase } from '../db/database.js';

/**
 * Create analytics router with optional database instance
 */
export function createAnalyticsRouter(db?: ReturnType<typeof getDatabase>) {
  const router = Router();
  const database = db || getDatabase();
  const capTableService = createCapTableService(db);

  /**
   * GET /api/analytics/holders
   * Get holder statistics and concentration metrics
   */
  router.get('/holders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const distribution = capTableService.getOwnershipDistribution();
      const topHolders = capTableService.getTopHolders(10);

      // Calculate additional metrics
      const holderCount = distribution.holderCount;
      const top10Percentage = distribution.topHoldersPercentage;

      // HHI concentration categories
      let concentrationLevel: string;
      if (distribution.concentrationRatio < 0.15) {
        concentrationLevel = 'low';
      } else if (distribution.concentrationRatio < 0.25) {
        concentrationLevel = 'moderate';
      } else {
        concentrationLevel = 'high';
      }

      res.status(200).json({
        holderCount,
        top10Concentration: top10Percentage,
        hhiIndex: distribution.concentrationRatio,
        topHolders: topHolders.slice(0, 10).map((holder, index) => ({
          rank: index + 1,
          address: holder.address,
          balance: holder.balanceFormatted,
          percentage: holder.ownershipPercentage,
        })),
        medianHolding: parseFloat(distribution.medianHolding),
        averageHolding: parseFloat(distribution.averageHolding),
        concentrationLevel,
      });
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/analytics/supply
   * Get token supply metrics
   */
  router.get('/supply', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const capTable = capTableService.generateCapTable();

      // Get all transfer events to calculate minted vs circulating
      const mintEvents = database.getEventsByType('Transfer', 1000);

      // Calculate total minted (from zero address)
      let totalMinted = BigInt(0);
      for (const event of mintEvents) {
        if (event.from_address === '0x0000000000000000000000000000000000000000' && event.amount) {
          totalMinted += BigInt(event.amount);
        }
      }

      // Format supply metrics
      const { ethers } = await import('ethers');
      const _totalMintedFormatted = ethers.formatEther(totalMinted);

      // Get split multiplier
      const splitMultiplierStr = database.getMetadata('split_multiplier');
      const splitMultiplierBP = splitMultiplierStr ? parseInt(splitMultiplierStr) : 10000;
      const splitMultiplier = splitMultiplierBP / 10000;

      // Calculate effective supply: totalSupply * (splitMultiplier / 10000)
      const totalSupply = parseFloat(capTable.totalSupplyFormatted);
      const effectiveSupply = totalSupply * (splitMultiplier / 10000);

      res.status(200).json({
        totalSupply,
        splitMultiplier,
        effectiveSupply,
      });
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/analytics/distribution
   * Get token distribution analysis with decentralization metrics
   */
  router.get('/distribution', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const distribution = capTableService.getOwnershipDistribution();
      const capTable = capTableService.generateCapTable();

      // Calculate distribution buckets
      const buckets = {
        whales: { min: 10, max: 100, count: 0, totalPercentage: 0 }, // >10%
        large: { min: 1, max: 10, count: 0, totalPercentage: 0 }, // 1-10%
        medium: { min: 0.1, max: 1, count: 0, totalPercentage: 0 }, // 0.1-1%
        small: { min: 0.01, max: 0.1, count: 0, totalPercentage: 0 }, // 0.01-0.1%
        tiny: { min: 0, max: 0.01, count: 0, totalPercentage: 0 }, // <0.01%
      };

      for (const entry of capTable.entries) {
        const percentage = entry.ownershipPercentage;

        if (percentage >= 10) {
          buckets.whales.count++;
          buckets.whales.totalPercentage += percentage;
        } else if (percentage >= 1) {
          buckets.large.count++;
          buckets.large.totalPercentage += percentage;
        } else if (percentage >= 0.1) {
          buckets.medium.count++;
          buckets.medium.totalPercentage += percentage;
        } else if (percentage >= 0.01) {
          buckets.small.count++;
          buckets.small.totalPercentage += percentage;
        } else {
          buckets.tiny.count++;
          buckets.tiny.totalPercentage += percentage;
        }
      }

      // Calculate Gini coefficient (approximation)
      const sortedEntries = [...capTable.entries].sort((a, b) => {
        const balanceA = BigInt(a.balance);
        const balanceB = BigInt(b.balance);
        return balanceA > balanceB ? 1 : balanceA < balanceB ? -1 : 0;
      });

      let _cumulativeSum = 0;
      let giniNumerator = 0;
      const totalSupplyNum = parseFloat(capTable.totalSupplyFormatted);

      for (let i = 0; i < sortedEntries.length; i++) {
        const balance = parseFloat(sortedEntries[i].balanceFormatted);
        _cumulativeSum += balance;
        giniNumerator += (i + 1) * balance;
      }

      const giniCoefficient =
        sortedEntries.length > 0
          ? (2 * giniNumerator) / (sortedEntries.length * totalSupplyNum) -
            (sortedEntries.length + 1) / sortedEntries.length
          : 0;

      // Decentralization score (0-100, higher is more decentralized)
      const decentralizationScore = Math.max(
        0,
        Math.min(
          100,
          (1 - distribution.concentrationRatio) *
            100 *
            (1 - giniCoefficient) *
            Math.min(1, distribution.holderCount / 100)
        )
      );

      res.status(200).json({
        holderCount: distribution.holderCount,
        medianHolding: parseFloat(distribution.medianHolding),
        averageHolding: parseFloat(distribution.averageHolding),
        concentrationRatio: distribution.concentrationRatio,
        giniCoefficient,
        decentralizationScore,
      });
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/analytics/events
   * Get event statistics and activity metrics
   */
  router.get('/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '100', offset = '0' } = req.query;

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
        limitNum = 100; // Use default limit for invalid values
      }

      // Parse offset with graceful fallback to 0
      let offsetNum = parseInt(offset as string);
      if (isNaN(offsetNum) || offsetNum < 0) {
        offsetNum = 0;
      }

      // Get all events, then apply offset and limit
      const allEvents = database.getAllEvents(limitNum + offsetNum);
      const events = allEvents.slice(offsetNum);

      // Format events to match test expectations
      const formattedEvents = events.map((event) => ({
        event_type: event.event_type,
        transaction_hash: event.transaction_hash,
        block_number: event.block_number,
        timestamp: event.timestamp,
        from_address: event.from_address,
        to_address: event.to_address,
        amount: event.amount,
      }));

      res.status(200).json(formattedEvents);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/analytics/overview
   * Get comprehensive analytics overview
   */
  router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const distribution = capTableService.getOwnershipDistribution();
      const capTable = capTableService.generateCapTable();

      // Get recent activity (corporate actions)
      const recentActivity = database.getAllCorporateActions(10);

      res.status(200).json({
        totalSupply: capTable.totalSupplyFormatted,
        holderCount: distribution.holderCount,
        splitMultiplier: capTable.splitMultiplier,
        recentActivity: recentActivity.map((action) => ({
          type: action.action_type,
          blockNumber: action.block_number,
          transactionHash: action.transaction_hash,
          timestamp: action.timestamp,
        })),
      });
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}

// Export default router for backwards compatibility
export default createAnalyticsRouter();
