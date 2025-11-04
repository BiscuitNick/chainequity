/**
 * Express server for ChainEquity backend
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config/env.js';
import { getDatabase } from './db/database.js';

// Validate configuration
validateConfig();

// Initialize Express app
const app = express();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? process.env.CORS_ORIGIN : '*',
    credentials: true,
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Import routes
import issuerRoutes from './api/issuer.routes.js';
import corporateRoutes from './api/corporate.routes.js';
import captableRoutes from './api/captable.routes.js';
import analyticsRoutes from './api/analytics.routes.js';

// Import middleware
import { apiLimiter } from './middleware/rateLimit.js';

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// API routes
app.use('/api/issuer', issuerRoutes);
app.use('/api/corporate', corporateRoutes);
app.use('/api/captable', captableRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'ChainEquity Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        issuer: '/api/issuer',
        corporate: '/api/corporate',
        captable: '/api/captable',
        analytics: '/api/analytics',
      },
    },
  });
});

// ============================================
// Error Handling
// ============================================

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// Server Lifecycle
// ============================================

let server: any;

function startServer() {
  try {
    // Initialize database
    getDatabase(config.databasePath);
    console.log('Database initialized');

    // Start server
    server = app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║   ChainEquity Backend Server Started     ║
╠═══════════════════════════════════════════╣
║ Environment: ${config.nodeEnv.padEnd(28)}║
║ Port:        ${config.port.toString().padEnd(28)}║
║ Database:    ${config.databasePath.padEnd(28)}║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Closing server gracefully...`);

  if (server) {
    server.close(() => {
      console.log('HTTP server closed');

      try {
        // Close database connection
        const db = getDatabase();
        db.close();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      }

      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forcing server shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };
