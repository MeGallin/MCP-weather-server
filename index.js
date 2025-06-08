import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mcpController from './controllers/mcpController.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  generalLimiter,
  mcpLimiter,
  authLimiter,
} from './middleware/rateLimiter.js';
import { authenticateToken, authenticateApiKey } from './middleware/auth.js';
import { logger, logRequest } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  }),
);

// CORS configuration
const corsOptions = {
  origin:
    process.env.CORS_ORIGIN === '*'
      ? true
      : process.env.CORS_ORIGIN?.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
};
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  logRequest(req, res);
  next();
});

// General rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(
  express.json({
    limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.REQUEST_SIZE_LIMIT || '10mb',
  }),
);

// Authentication routes (no rate limiting for login to allow retries)
app.post('/auth/login', authLimiter, mcpController.handleLogin);
app.post(
  '/auth/api-key',
  authenticateToken,
  mcpController.handleApiKeyGeneration,
);

// MCP routes with specific rate limiting (authentication removed for public access)
app.post(
  '/mcp',
  mcpLimiter,
  (req, res, next) => {
    // Add VS Code MCP client detection and optimization
    const userAgent = req.get('User-Agent') || '';
    const isVSCodeMCP =
      userAgent.includes('vscode') || userAgent.includes('mcp-client');

    if (isVSCodeMCP) {
      // Set specific headers for VS Code MCP client
      res.set({
        'X-MCP-Transport': 'http',
        'X-MCP-Server-Ready': 'true',
        'Keep-Alive': 'timeout=60, max=100',
      });
    }

    next();
  },
  mcpController.handleMCPRequest,
);

// Enhanced health check endpoint for MCP clients
app.get('/mcp/health', (req, res) => {
  res.json({
    status: 'ready',
    transport: 'http',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
    },
    serverInfo: {
      name: 'MCP Weather Server',
      version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint for VS Code MCP client fallback
app.get('/mcp', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Send initial connection message
  res.write('data: {"type":"connection","status":"connected"}\n\n');

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(
      'data: {"type":"ping","timestamp":"' +
        new Date().toISOString() +
        '"}\n\n',
    );
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// OPTIONS endpoint for CORS preflight
app.options('/mcp', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key',
  );
  res.sendStatus(200);
});

// Public routes
app.get('/', (req, res) => {
  res.json({
    name: 'MCP Weather Server',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      mcp: '/mcp (public access)',
      auth: '/auth/login',
      apiKey: '/auth/api-key',
    },
    documentation: 'https://github.com/your-repo/MCP-weather-server#readme',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API documentation endpoint (development only)
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.ENABLE_API_DOCS === 'true'
) {
  app.get('/docs', (req, res) => {
    res.json({
      endpoints: {
        '/health': 'GET - Health check',
        '/mcp': 'POST/GET - MCP request handler (public access)',
        '/auth/login': 'POST - User authentication',
        '/auth/api-key': 'POST - Generate API key (requires JWT token)',
      },
      authentication: {
        jwt: 'Bearer token in Authorization header',
        apiKey: 'X-API-Key header for MCP requests',
      },
      rateLimits: {
        general: '100 requests per 15 minutes',
        mcp: '30 requests per minute',
        auth: '5 requests per 15 minutes',
      },
    });
  });
}

// Global error handler
app.use(errorHandler);

// Handle 404 errors
app.use('*', (req, res) => {
  // Reduce logging for common health check patterns
  const isHealthCheck =
    req.get('User-Agent')?.includes('Go-http-client') ||
    req.get('User-Agent')?.includes('curl') ||
    req.originalUrl === '/favicon.ico';

  if (!isHealthCheck) {
    logger.warn('404 Not Found', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
    suggestion: 'Try /health for server status or /mcp for MCP requests',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`MCP server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  });
});
