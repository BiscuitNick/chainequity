/**
 * Error Handling Middleware
 *
 * Centralized error handling with proper status codes and error formatting
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

/**
 * Custom error class with status code
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  stack?: string;
  details?: any;
}

/**
 * Parse error type and return appropriate status code
 */
function getStatusCode(error: any): number {
  // Check if it's our custom ApiError
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  // Check error message for common patterns
  const errorMessage = error.message?.toLowerCase() || '';

  // Validation errors
  if (errorMessage.includes('invalid address') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('must be') ||
      errorMessage.includes('required')) {
    return 400;
  }

  // Not found errors
  if (errorMessage.includes('not found')) {
    return 404;
  }

  // Permission errors
  if (errorMessage.includes('not approved') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('permission denied')) {
    return 403;
  }

  // Blockchain errors
  if (errorMessage.includes('insufficient funds') ||
      errorMessage.includes('gas required exceeds') ||
      errorMessage.includes('execution reverted')) {
    return 400;
  }

  // Service unavailable
  if (errorMessage.includes('service not initialized') ||
      errorMessage.includes('connection failed')) {
    return 503;
  }

  // Default to 500
  return 500;
}

/**
 * Get error name based on status code
 */
function getErrorName(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return 'Error';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('\n❌ Error occurred:');
  console.error('Path:', req.method, req.path);
  console.error('Error:', err.message);

  if (config.nodeEnv === 'development') {
    console.error('Stack:', err.stack);
  }

  // Determine status code
  const statusCode = getStatusCode(err);

  // Build error response
  const errorResponse: ErrorResponse = {
    error: getErrorName(statusCode),
    message: err.message,
    statusCode,
  };

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
  }

  // Add any additional error details
  if ('details' in err) {
    errorResponse.details = (err as any).details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}
