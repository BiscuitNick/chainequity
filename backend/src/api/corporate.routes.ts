/**
 * Corporate Actions API Routes
 *
 * Handles stock splits, symbol changes, and corporate action history
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createIssuerService } from '../services/issuer.service.js';
import { getDatabase } from '../db/database.js';

const router = Router();

// Initialize services
let issuerService: ReturnType<typeof createIssuerService>;
const db = getDatabase();

try {
  issuerService = createIssuerService();
} catch (error) {
  console.error('Failed to initialize IssuerService:', error);
}

/**
 * Middleware to check if issuer service is available
 */
function requireIssuerService(req: Request, res: Response, next: NextFunction): void {
  if (!issuerService) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Issuer service is not initialized',
    });
    return;
  }
  next();
}

/**
 * POST /api/corporate/split
 * Execute a stock split
 */
router.post('/split', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { multiplierBasisPoints, multiplier } = req.body;

    // Allow either multiplierBasisPoints or multiplier
    let basisPoints: number;

    if (multiplierBasisPoints !== undefined) {
      basisPoints = parseInt(multiplierBasisPoints);

      if (isNaN(basisPoints) || basisPoints <= 0 || basisPoints === 10000) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'multiplierBasisPoints must be a positive number and not equal to 10000 (basis points)',
        });
        return;
      }
    } else if (multiplier !== undefined) {
      // Convert decimal multiplier to basis points (e.g., 2.0 -> 20000, 0.5 -> 5000)
      const multiplierNum = parseFloat(multiplier);

      if (isNaN(multiplierNum) || multiplierNum <= 0 || multiplierNum === 1.0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'multiplier must be a positive number and not equal to 1.0',
        });
        return;
      }

      basisPoints = Math.round(multiplierNum * 10000);
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Either multiplierBasisPoints or multiplier is required',
      });
      return;
    }

    // Get current split multiplier
    const currentMultiplier = await issuerService.getSplitMultiplier();

    // Execute split
    const receipt = await issuerService.executeSplit(basisPoints);

    // Get new multiplier
    const newMultiplier = await issuerService.getSplitMultiplier();

    res.status(200).json({
      success: true,
      message: 'Stock split executed successfully',
      data: {
        multiplierBasisPoints: basisPoints,
        multiplierDecimal: basisPoints / 10000,
        previousMultiplierBasisPoints: currentMultiplier,
        previousMultiplierDecimal: currentMultiplier / 10000,
        newMultiplierBasisPoints: newMultiplier,
        newMultiplierDecimal: newMultiplier / 10000,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/corporate/symbol
 * Update token symbol
 */
router.post('/symbol', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newSymbol } = req.body;

    if (!newSymbol || typeof newSymbol !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'newSymbol is required and must be a string',
      });
    }

    // Validate symbol format
    if (!/^[A-Z]{3,5}$/.test(newSymbol)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Symbol must be 3-5 uppercase letters',
      });
    }

    // Get current token info
    const currentInfo = await issuerService.getTokenInfo();

    // Update symbol
    const receipt = await issuerService.updateSymbol(newSymbol);

    res.status(200).json({
      success: true,
      message: 'Token symbol updated successfully',
      data: {
        oldSymbol: currentInfo.symbol,
        newSymbol,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/corporate/name
 * Update token name
 */
router.post('/name', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newName } = req.body;

    if (!newName || typeof newName !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'newName is required and must be a string',
      });
    }

    if (newName.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name cannot be empty',
      });
    }

    // Get current token info
    const currentInfo = await issuerService.getTokenInfo();

    // Update name
    const receipt = await issuerService.updateName(newName);

    res.status(200).json({
      success: true,
      message: 'Token name updated successfully',
      data: {
        oldName: currentInfo.name,
        newName,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/corporate/history
 * Get corporate action history with pagination
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '50', actionType } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a positive number between 1 and 500',
      });
    }

    // Get corporate actions
    let actions;
    if (actionType && typeof actionType === 'string') {
      actions = db.getCorporateActionsByType(actionType as any, limitNum);
    } else {
      actions = db.getAllCorporateActions(limitNum);
    }

    // Format the response
    const formattedActions = actions.map((action) => {
      const baseAction = {
        id: action.id,
        actionType: action.action_type,
        blockNumber: action.block_number,
        transactionHash: action.transaction_hash,
        timestamp: action.timestamp,
        date: new Date(action.timestamp * 1000).toISOString(),
      };

      // Add type-specific data
      if (action.action_type === 'StockSplit') {
        return {
          ...baseAction,
          multiplierBasisPoints: parseInt(action.old_value || '10000'),
          multiplierDecimal: parseInt(action.old_value || '10000') / 10000,
          newSplitMultiplierBasisPoints: parseInt(action.new_value || '10000'),
          newSplitMultiplierDecimal: parseInt(action.new_value || '10000') / 10000,
        };
      } else if (action.action_type === 'SymbolChange') {
        return {
          ...baseAction,
          oldSymbol: action.old_value,
          newSymbol: action.new_value,
        };
      } else if (action.action_type === 'NameChange') {
        return {
          ...baseAction,
          oldName: action.old_value,
          newName: action.new_value,
        };
      }

      return baseAction;
    });

    res.status(200).json({
      success: true,
      data: {
        actions: formattedActions,
        count: formattedActions.length,
        limit: limitNum,
        ...(actionType && { actionType }),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/corporate/splits
 * Get stock split history
 */
router.get('/splits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '50' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'limit must be a positive number between 1 and 500',
      });
    }

    const splits = db.getCorporateActionsByType('StockSplit', limitNum);

    const formattedSplits = splits.map((split) => ({
      id: split.id,
      blockNumber: split.block_number,
      transactionHash: split.transaction_hash,
      multiplierBasisPoints: parseInt(split.old_value || '10000'),
      multiplierDecimal: parseInt(split.old_value || '10000') / 10000,
      newSplitMultiplierBasisPoints: parseInt(split.new_value || '10000'),
      newSplitMultiplierDecimal: parseInt(split.new_value || '10000') / 10000,
      timestamp: split.timestamp,
      date: new Date(split.timestamp * 1000).toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: {
        splits: formattedSplits,
        count: formattedSplits.length,
        limit: limitNum,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
