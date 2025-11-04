/**
 * Corporate Actions API Routes
 *
 * Handles stock splits, symbol changes, and corporate action history
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createIssuerService } from '../services/issuer.service.js';
import { getDatabase } from '../db/database.js';

/**
 * Create corporate router with optional database instance
 */
export function createCorporateRouter(db?: ReturnType<typeof getDatabase>) {
  const router = Router();
  const database = db || getDatabase();

  // Initialize services
  let issuerService: ReturnType<typeof createIssuerService>;

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
  router.post(
    '/split',
    requireIssuerService,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { multiplierBasisPoints, multiplier } = req.body;

        // Allow either multiplierBasisPoints or multiplier
        let basisPoints: number;

        if (multiplierBasisPoints !== undefined) {
          basisPoints = parseInt(multiplierBasisPoints);

          if (isNaN(basisPoints) || basisPoints <= 0 || basisPoints === 10000) {
            res.status(400).json({
              error: 'Bad Request',
              message:
                'multiplierBasisPoints must be a positive number and not equal to 10000 (basis points)',
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
    }
  );

  /**
   * POST /api/corporate/symbol
   * Update token symbol
   */
  router.post(
    '/symbol',
    requireIssuerService,
    async (req: Request, res: Response, next: NextFunction) => {
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
    }
  );

  /**
   * POST /api/corporate/name
   * Update token name
   */
  router.post(
    '/name',
    requireIssuerService,
    async (req: Request, res: Response, next: NextFunction) => {
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
    }
  );

  /**
   * GET /api/corporate/history
   * Get corporate action history with pagination
   */
  router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50', actionType } = req.query;

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 50; // Use default limit for invalid values
      }

      // Get corporate actions
      let actions;
      if (actionType && typeof actionType === 'string') {
        actions = database.getCorporateActionsByType(actionType as any, limitNum);
      } else {
        actions = database.getAllCorporateActions(limitNum);
      }

      // Format the response
      const formattedActions = actions.map((action) => {
        const baseAction = {
          id: action.id,
          action_type: action.action_type,
          block_number: action.block_number,
          transaction_hash: action.transaction_hash,
          old_value: action.old_value,
          new_value: action.new_value,
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

      res.status(200).json(formattedActions);
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

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 50; // Use default limit for invalid values
      }

      const splits = database.getCorporateActionsByType('StockSplit', limitNum);

      const formattedSplits = splits.map((split) => ({
        id: split.id,
        action_type: 'StockSplit',
        blockNumber: split.block_number,
        transactionHash: split.transaction_hash,
        old_value: split.old_value,
        new_value: split.new_value,
        multiplierBasisPoints: parseInt(split.old_value || '10000'),
        multiplierDecimal: parseInt(split.old_value || '10000') / 10000,
        newSplitMultiplierBasisPoints: parseInt(split.new_value || '10000'),
        newSplitMultiplierDecimal: parseInt(split.new_value || '10000') / 10000,
        timestamp: split.timestamp,
        date: new Date(split.timestamp * 1000).toISOString(),
      }));

      res.status(200).json(formattedSplits);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/corporate/symbols
   * Get symbol change history
   */
  router.get('/symbols', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50' } = req.query;

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 50; // Use default limit for invalid values
      }

      const symbols = database.getCorporateActionsByType('SymbolChange', limitNum);

      const formattedSymbols = symbols.map((symbol) => ({
        id: symbol.id,
        action_type: 'SymbolChange',
        blockNumber: symbol.block_number,
        transactionHash: symbol.transaction_hash,
        oldSymbol: symbol.old_value,
        newSymbol: symbol.new_value,
        old_value: symbol.old_value,
        new_value: symbol.new_value,
        timestamp: symbol.timestamp,
        date: new Date(symbol.timestamp * 1000).toISOString(),
      }));

      res.status(200).json(formattedSymbols);
    } catch (error: any) {
      next(error);
    }
  });

  /**
   * GET /api/corporate/names
   * Get name change history
   */
  router.get('/names', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = '50' } = req.query;

      // Parse limit with graceful fallback to default
      let limitNum = parseInt(limit as string);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 500) {
        limitNum = 50; // Use default limit for invalid values
      }

      const names = database.getCorporateActionsByType('NameChange', limitNum);

      const formattedNames = names.map((name) => ({
        id: name.id,
        action_type: 'NameChange',
        blockNumber: name.block_number,
        transactionHash: name.transaction_hash,
        oldName: name.old_value,
        newName: name.new_value,
        old_value: name.old_value,
        new_value: name.new_value,
        timestamp: name.timestamp,
        date: new Date(name.timestamp * 1000).toISOString(),
      }));

      res.status(200).json(formattedNames);
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}

// Export default router for backwards compatibility
export default createCorporateRouter();
