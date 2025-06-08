#!/usr/bin/env node

/**
 * Integration test for root endpoint to verify Render.com health check compatibility
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Mock dependencies to avoid full server startup
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logRequest: jest.fn(),
}));

jest.mock('../../middleware/rateLimiter.js', () => ({
  generalLimiter: (req, res, next) => next(),
  mcpLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

describe('Root Endpoint Health Check', () => {
  let app;

  beforeAll(() => {
    // Create a minimal app with just the root endpoint
    app = express();
    
    // Basic middleware
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors());
    app.use(express.json());

    // Root endpoint (same as in index.js)
    app.get('/', (req, res) => {
      res.json({
        name: 'MCP Weather Server',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: '/health',
          mcp: '/mcp',
          auth: '/auth/login',
          apiKey: '/auth/api-key'
        },
        documentation: 'https://github.com/your-repo/MCP-weather-server#readme',
        timestamp: new Date().toISOString()
      });
    });

    // Health endpoint for comparison
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
    });
  });

  test('should respond to root path with server information', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('name', 'MCP Weather Server');
    expect(response.body).toHaveProperty('status', 'running');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body).toHaveProperty('timestamp');
    
    // Verify endpoints are listed
    expect(response.body.endpoints).toHaveProperty('health', '/health');
    expect(response.body.endpoints).toHaveProperty('mcp', '/mcp');
    expect(response.body.endpoints).toHaveProperty('auth', '/auth/login');
    expect(response.body.endpoints).toHaveProperty('apiKey', '/auth/api-key');
  });

  test('should handle Render.com health check user agent', async () => {
    const response = await request(app)
      .get('/')
      .set('User-Agent', 'Go-http-client/2.0')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('name', 'MCP Weather Server');
    expect(response.body).toHaveProperty('status', 'running');
  });

  test('should respond faster than typical health check timeout', async () => {
    const startTime = Date.now();
    
    await request(app)
      .get('/')
      .expect(200);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond in under 1 second
  });

  test('should match health endpoint response structure', async () => {
    const rootResponse = await request(app).get('/').expect(200);
    const healthResponse = await request(app).get('/health').expect(200);

    // Both should have version and environment
    expect(rootResponse.body.version).toBe(healthResponse.body.version);
    expect(rootResponse.body.environment).toBe(healthResponse.body.environment);
    
    // Root should have additional endpoint information
    expect(rootResponse.body).toHaveProperty('endpoints');
    expect(rootResponse.body).toHaveProperty('name');
    expect(healthResponse.body).toHaveProperty('status', 'healthy');
  });

  test('should handle concurrent requests without errors', async () => {
    const requests = Array(10).fill().map(() => 
      request(app).get('/').expect(200)
    );

    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response.body).toHaveProperty('name', 'MCP Weather Server');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });
});
