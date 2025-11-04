/**
 * Issuer API Routes
 *
 * Handles wallet approval/revocation and token minting operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createIssuerService } from '../services/issuer.service.js';

const router = Router();

// Initialize issuer service
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
  }
  next();
}

/**
 * POST /api/issuer/approve
 * Approve a wallet to send/receive tokens
 */
router.post('/approve', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Address is required and must be a string',
      });
    }

    // Check if already approved
    const isApproved = await issuerService.isWalletApproved(address);
    if (isApproved) {
      res.status(200).json({
        success: true,
        message: 'Wallet is already approved',
        data: {
          address,
          status: 'approved',
        },
      });
    }

    // Approve wallet
    const receipt = await issuerService.approveWallet(address);

    res.status(200).json({
      success: true,
      message: 'Wallet approved successfully',
      data: {
        address,
        status: 'approved',
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
 * POST /api/issuer/revoke
 * Revoke wallet approval
 */
router.post('/revoke', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Address is required and must be a string',
      });
    }

    // Check if already revoked
    const isApproved = await issuerService.isWalletApproved(address);
    if (!isApproved) {
      res.status(200).json({
        success: true,
        message: 'Wallet is already revoked',
        data: {
          address,
          status: 'revoked',
        },
      });
    }

    // Revoke wallet
    const receipt = await issuerService.revokeWallet(address);

    res.status(200).json({
      success: true,
      message: 'Wallet revoked successfully',
      data: {
        address,
        status: 'revoked',
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
 * GET /api/issuer/status/:address
 * Check if a wallet is approved
 */
router.get('/status/:address', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Address parameter is required',
      });
    }

    const isApproved = await issuerService.isWalletApproved(address);

    res.status(200).json({
      success: true,
      data: {
        address,
        isApproved,
        status: isApproved ? 'approved' : 'not_approved',
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/issuer/approved
 * Get all approved wallets
 */
router.get('/approved', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approvedWallets = await issuerService.getApprovedWallets();

    res.status(200).json({
      success: true,
      data: {
        wallets: approvedWallets,
        count: approvedWallets.length,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/issuer/mint
 * Mint tokens to an approved address
 */
router.post('/mint', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, amount } = req.body;

    // Validate inputs
    if (!to || typeof to !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Recipient address (to) is required and must be a string',
      });
    }

    if (!amount || typeof amount !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Amount is required and must be a string',
      });
    }

    // Validate amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Amount must be a positive number',
      });
    }

    // Check if recipient is approved
    const isApproved = await issuerService.isWalletApproved(to);
    if (!isApproved) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Recipient wallet is not approved',
      });
    }

    // Mint tokens
    const receipt = await issuerService.mintTokens(to, amount);

    res.status(200).json({
      success: true,
      message: 'Tokens minted successfully',
      data: {
        to,
        amount,
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
 * GET /api/issuer/info
 * Get token information
 */
router.get('/info', requireIssuerService, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenInfo = await issuerService.getTokenInfo();
    const totalSupply = await issuerService.getTotalSupply();
    const splitMultiplier = await issuerService.getSplitMultiplier();

    res.status(200).json({
      success: true,
      data: {
        ...tokenInfo,
        totalSupply,
        splitMultiplier,
        splitMultiplierDecimal: splitMultiplier / 10000,
        contractAddress: issuerService.getContractAddress(),
        signerAddress: issuerService.getSignerAddress(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
