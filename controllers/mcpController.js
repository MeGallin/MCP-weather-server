import axios from 'axios';
import { buildMCPResponse } from '../utils/mcpUtils.js';
import {
  validateMCPRequest,
  validateAuthRequest,
} from '../utils/validation.js';
import endpoints from '../config/endpoints.js';
import { logger, logAuth, logAPIPerformance } from '../utils/logger.js';
import {
  authenticateUser,
  generateToken,
  generateApiKey,
} from '../middleware/auth.js';

export default {
  async handleMCPRequest(req, res) {
    try {
      // Validate incoming MCP request
      const { error, value: mcpContext } = validateMCPRequest(req.body);
      if (error) {
        logger.warn('Invalid MCP request:', error.details);
        return res.status(400).json({
          error: 'Invalid MCP request',
          details: error.details.map((d) => d.message),
        });
      }

      // Extract endpoint and params from context
      const { endpointName, queryParams, authHeaders } = mcpContext.input || {};

      if (!endpointName || !endpoints[endpointName]) {
        logger.warn(`Invalid or missing endpointName: ${endpointName}`);
        return res.status(400).json({
          error: 'Invalid or missing endpointName',
          availableEndpoints: Object.keys(endpoints),
        });
      } // Prepare request configuration
      const endpointConfig = endpoints[endpointName];

      // Merge defaultParams with queryParams, with queryParams taking precedence
      const mergedParams = {
        ...endpointConfig.defaultParams,
        ...queryParams,
      };

      const requestConfig = {
        params: mergedParams,
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'MCP-Weather-Server/1.0.0',
          ...authHeaders,
        },
      };
      logger.info(`Fetching data from endpoint: ${endpointName}`);

      // Fetch from the external endpoint
      const { data } = await axios.get(endpointConfig.url, requestConfig);

      // Transform data if transformer function exists
      const transformedData = endpointConfig.transformer
        ? endpointConfig.transformer(data)
        : data;

      // Build the updated MCP context
      const updatedContext = buildMCPResponse(
        mcpContext,
        transformedData,
        endpointName,
      );

      logger.info(`Successfully processed MCP request for: ${endpointName}`);
      res.json(updatedContext);
    } catch (err) {
      logger.error('Error processing MCP request:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
      });

      if (err.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Request timeout',
          details: 'External API request timed out',
        });
      }

      if (err.response) {
        return res.status(502).json({
          error: 'External API error',
          details: `API returned ${err.response.status}: ${err.response.statusText}`,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        details: err.message,
      });
    }
  },

  /**
   * Handle user login and JWT token generation
   */
  async handleLogin(req, res) {
    try {
      const startTime = Date.now();

      // Validate login request
      const { error, value: authData } = validateAuthRequest(req.body, 'login');
      if (error) {
        logAuth('LOGIN_FAILED', req.ip, null, 'Invalid request format');
        return res.status(400).json({
          error: 'Invalid login request',
          details: error.details.map((d) => d.message),
        });
      }

      const { username, password } = authData;

      // Authenticate user
      const user = await authenticateUser(username, password);
      if (!user) {
        logAuth('LOGIN_FAILED', req.ip, username, 'Invalid credentials');
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid username or password',
        });
      }

      // Generate JWT token
      const token = generateToken(user);

      logAuth('LOGIN_SUCCESS', req.ip, username, 'User logged in successfully');
      logAPIPerformance('AUTH_LOGIN', Date.now() - startTime, 'success');

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    } catch (err) {
      logger.error('Login error:', err);
      logAuth('LOGIN_ERROR', req.ip, req.body?.username, err.message);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Login failed due to server error',
      });
    }
  },

  /**
   * Handle API key generation for authenticated users
   */
  async handleApiKeyGeneration(req, res) {
    try {
      const startTime = Date.now();

      // Validate API key request
      const { error, value: keyData } = validateAuthRequest(req.body, 'apiKey');
      if (error) {
        return res.status(400).json({
          error: 'Invalid API key request',
          details: error.details.map((d) => d.message),
        });
      }

      const { keyName, permissions } = keyData;
      const user = req.user; // Set by authenticateToken middleware

      // Generate new API key
      const apiKey = generateApiKey(user, keyName, permissions);

      logAuth(
        'API_KEY_GENERATED',
        req.ip,
        user.username,
        `Generated API key: ${keyName}`,
      );
      logAPIPerformance('AUTH_API_KEY', Date.now() - startTime, 'success');

      res.json({
        success: true,
        message: 'API key generated successfully',
        apiKey: {
          key: apiKey,
          name: keyName,
          permissions: permissions || ['read'],
          createdAt: new Date().toISOString(),
          expiresAt: null, // API keys don't expire by default
        },
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (err) {
      logger.error('API key generation error:', err);

      res.status(500).json({
        error: 'Internal server error',
        message: 'API key generation failed',
      });
    }
  },
};
