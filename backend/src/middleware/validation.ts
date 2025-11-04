/**
 * Request Validation Middleware
 *
 * Provides validation utilities for API requests
 */

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

/**
 * Validate Ethereum address format
 */
export function validateAddress(field: string = 'address') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const address = req.body[field] || req.params[field];

    if (!address) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} is required`,
      });
      return;
    }

    if (!ethers.isAddress(address)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid Ethereum address: ${field}`,
      });
      return;
    }

    next();
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(field: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field] || req.query[field] || req.params[field];

    if (value === undefined || value === null) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} is required`,
      });
      return;
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num) || num <= 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be a positive number`,
      });
      return;
    }

    next();
  };
}

/**
 * Validate integer
 */
export function validateInteger(field: string, min?: number, max?: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field] || req.query[field] || req.params[field];

    if (value === undefined || value === null) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} is required`,
      });
      return;
    }

    const num = typeof value === 'string' ? parseInt(value) : value;

    if (isNaN(num) || !Number.isInteger(num)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be an integer`,
      });
      return;
    }

    if (min !== undefined && num < min) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be at least ${min}`,
      });
      return;
    }

    if (max !== undefined && num > max) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be at most ${max}`,
      });
      return;
    }

    next();
  };
}

/**
 * Validate enum value
 */
export function validateEnum(field: string, allowedValues: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field] || req.query[field] || req.params[field];

    if (value === undefined || value === null) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} is required`,
      });
      return;
    }

    if (!allowedValues.includes(value)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be one of: ${allowedValues.join(', ')}`,
      });
      return;
    }

    next();
  };
}

/**
 * Sanitize string input (trim whitespace)
 */
export function sanitizeString(field: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      req.body[field] = req.body[field].trim();
    }

    next();
  };
}

/**
 * Validate token symbol format
 */
export function validateSymbol(field: string = 'newSymbol') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const symbol = req.body[field];

    if (!symbol || typeof symbol !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} is required and must be a string`,
      });
      return;
    }

    if (!/^[A-Z]{3,5}$/.test(symbol)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `${field} must be 3-5 uppercase letters`,
      });
      return;
    }

    next();
  };
}
