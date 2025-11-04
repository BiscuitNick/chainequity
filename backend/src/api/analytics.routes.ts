/**
 * Analytics API Routes
 *
 * Provides analytics endpoints for holder statistics, supply metrics, and distribution analysis
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createCapTableService } from '../services/captable.service.js';
import { getDatabase } from '../db/database.js';

const router = Router();

// Initialize services
const capTableService = createCapTableService();
const db = getDatabase();

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
      success: true,
      data: {
        holderCount,
        topHolders: topHolders.slice(0, 10).map((holder, index) => ({
          rank: index + 1,
          address: holder.address,
          balance: holder.balanceFormatted,
          ownershipPercentage: holder.ownershipPercentage,
        })),
        concentration: {
          top10Percentage,
          herfindahlIndex: distribution.concentrationRatio,
          concentrationLevel,
        },
        medianHolding: distribution.medianHolding,
        averageHolding: distribution.averageHolding,
      },
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
    const mintEvents = db.getEventsByType('Transfer', 1000);

    // Calculate total minted (from zero address)
    let totalMinted = BigInt(0);
    for (const event of mintEvents) {
      if (event.from_address === '0x0000000000000000000000000000000000000000' && event.amount) {
        totalMinted += BigInt(event.amount);
      }
    }

    // Format supply metrics
    const { ethers } = await import('ethers');
    const totalMintedFormatted = ethers.formatEther(totalMinted);

    // Get split multiplier
    const splitMultiplierStr = db.getMetadata('split_multiplier');
    const splitMultiplierBP = splitMultiplierStr ? parseInt(splitMultiplierStr) : 10000;
    const splitMultiplier = splitMultiplierBP / 10000;

    res.status(200).json({
      success: true,
      data: {
        totalSupply: capTable.totalSupplyFormatted,
        totalSupplyRaw: capTable.totalSupply,
        circulatingSupply: capTable.totalSupplyFormatted, // Same as total supply for now
        totalMinted: totalMintedFormatted,
        splitMultiplier,
        splitMultiplierBasisPoints: splitMultiplierBP,
        holderCount: capTable.holderCount,
        supplyPerHolder:
          capTable.holderCount > 0
            ? (parseFloat(capTable.totalSupplyFormatted) / capTable.holderCount).toFixed(6)
            : '0',
      },
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

    let cumulativeSum = 0;
    let giniNumerator = 0;
    const totalSupplyNum = parseFloat(capTable.totalSupplyFormatted);

    for (let i = 0; i < sortedEntries.length; i++) {
      const balance = parseFloat(sortedEntries[i].balanceFormatted);
      cumulativeSum += balance;
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
      success: true,
      data: {
        holderCount: distribution.holderCount,
        totalSupply: distribution.totalSupply,
        distributionBuckets: {
          whales: {
            range: '>10%',
            holders: buckets.whales.count,
            totalOwnership: buckets.whales.totalPercentage.toFixed(2) + '%',
          },
          large: {
            range: '1-10%',
            holders: buckets.large.count,
            totalOwnership: buckets.large.totalPercentage.toFixed(2) + '%',
          },
          medium: {
            range: '0.1-1%',
            holders: buckets.medium.count,
            totalOwnership: buckets.medium.totalPercentage.toFixed(2) + '%',
          },
          small: {
            range: '0.01-0.1%',
            holders: buckets.small.count,
            totalOwnership: buckets.small.totalPercentage.toFixed(2) + '%',
          },
          tiny: {
            range: '<0.01%',
            holders: buckets.tiny.count,
            totalOwnership: buckets.tiny.totalPercentage.toFixed(2) + '%',
          },
        },
        metrics: {
          medianHolding: distribution.medianHolding,
          averageHolding: distribution.averageHolding,
          top10Percentage: distribution.topHoldersPercentage.toFixed(2) + '%',
          herfindahlIndex: distribution.concentrationRatio.toFixed(4),
          giniCoefficient: giniCoefficient.toFixed(4),
          decentralizationScore: decentralizationScore.toFixed(2),
        },
      },
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
    const { limit = '100' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a positive number between 1 and 1000',
      });
    }

    // Get recent events
    const recentEvents = db.getAllEvents(limitNum);

    // Count events by type
    const eventCounts: Record<string, number> = {};
    for (const event of recentEvents) {
      eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
    }

    // Get transfer volume
    const { ethers } = await import('ethers');
    let transferVolume = BigInt(0);
    let transferCount = 0;

    for (const event of recentEvents) {
      if (event.event_type === 'Transfer' && event.amount) {
        transferVolume += BigInt(event.amount);
        transferCount++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        recentEvents: recentEvents.slice(0, 20).map((event) => ({
          type: event.event_type,
          transactionHash: event.transaction_hash,
          blockNumber: event.block_number,
          from: event.from_address,
          to: event.to_address,
          amount: event.amount ? ethers.formatEther(event.amount) : undefined,
          timestamp: event.timestamp,
          date: event.timestamp ? new Date(event.timestamp * 1000).toISOString() : undefined,
        })),
        eventCounts,
        transferMetrics: {
          count: transferCount,
          volume: ethers.formatEther(transferVolume),
        },
        totalEventsReturned: recentEvents.length,
        limit: limitNum,
      },
    });
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
    const topHolders = capTableService.getTopHolders(5);

    // Get corporate actions count
    const corporateActions = db.getAllCorporateActions(100);
    const splitCount = corporateActions.filter((a) => a.action_type === 'StockSplit').length;
    const symbolChangeCount = corporateActions.filter(
      (a) => a.action_type === 'SymbolChange'
    ).length;

    res.status(200).json({
      success: true,
      data: {
        supply: {
          total: capTable.totalSupplyFormatted,
          splitMultiplier: capTable.splitMultiplier,
        },
        holders: {
          count: distribution.holderCount,
          top5: topHolders.map((h, i) => ({
            rank: i + 1,
            address: h.address,
            ownership: h.ownershipPercentage.toFixed(2) + '%',
          })),
        },
        distribution: {
          median: distribution.medianHolding,
          average: distribution.averageHolding,
          top10Percentage: distribution.topHoldersPercentage.toFixed(2) + '%',
          concentration: distribution.concentrationRatio.toFixed(4),
        },
        corporateActions: {
          total: corporateActions.length,
          splits: splitCount,
          symbolChanges: symbolChangeCount,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
