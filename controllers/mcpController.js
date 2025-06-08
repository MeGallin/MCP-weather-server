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
      // Set VS Code MCP-specific headers for connection stability
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-MCP-Server': 'weather-server',
        'X-MCP-Version': '2024-11-05',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, X-API-Key',
      });

      // Validate incoming MCP request
      const { error, value: mcpContext } = validateMCPRequest(req.body);
      if (error) {
        logger.warn('Invalid MCP request:', error.details);
        return res.status(400).json({
          error: 'Invalid MCP request',
          details: error.details.map((d) => d.message),
        });
      }

      // Handle different MCP methods for JSON-RPC format
      if (mcpContext.metadata?.format === 'jsonrpc') {
        const method = mcpContext.method;

        switch (method) {
          case 'initialize':
            const initResponse = {
              jsonrpc: '2.0',
              id: mcpContext.id,
              result: {
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
              },
            };
            logger.info('MCP client initialized');
            return res.json(initResponse);

          case 'tools/list':
            const toolsResponse = {
              jsonrpc: '2.0',
              id: mcpContext.id,
              result: {
                tools: [
                  {
                    name: 'get_weather',
                    description:
                      'Get current weather information for a location',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        location: {
                          type: 'string',
                          description:
                            'Location name (e.g., "London,UK" or "New York,US")',
                        },
                        latitude: {
                          type: 'number',
                          description: 'Latitude coordinate',
                        },
                        longitude: {
                          type: 'number',
                          description: 'Longitude coordinate',
                        },
                      },
                      required: ['location'],
                    },
                  },
                ],
              },
            };
            logger.info('Returned available tools list');
            return res.json(toolsResponse);

          case 'tools/call':
            // Process the tool call - convert location to coordinates if needed
            const toolArgs = mcpContext.input.queryParams;

            if (
              toolArgs.location &&
              !toolArgs.latitude &&
              !toolArgs.longitude
            ) {
              // Geocode the location to get coordinates
              try {
                const geoResponse = await axios.get(
                  'https://geocoding-api.open-meteo.com/v1/search',
                  {
                    params: {
                      name: toolArgs.location,
                      count: 1,
                      language: 'en',
                      format: 'json',
                    },
                    timeout: 5000,
                  },
                );

                if (geoResponse.data?.results?.[0]) {
                  const result = geoResponse.data.results[0];
                  mcpContext.input.queryParams = {
                    ...toolArgs,
                    latitude: result.latitude,
                    longitude: result.longitude,
                    location_name: `${result.name}, ${result.country}`,
                  };
                  logger.info(
                    `Geocoded ${toolArgs.location} to lat: ${result.latitude}, lon: ${result.longitude}`,
                  );
                } else {
                  const errorResponse = {
                    jsonrpc: '2.0',
                    id: mcpContext.id,
                    error: {
                      code: -32602,
                      message: `Location "${toolArgs.location}" not found`,
                      data: {
                        details: 'Could not geocode the provided location',
                      },
                    },
                  };
                  return res.json(errorResponse);
                }
              } catch (geoError) {
                logger.error('Geocoding error:', geoError.message);
                const errorResponse = {
                  jsonrpc: '2.0',
                  id: mcpContext.id,
                  error: {
                    code: -32603,
                    message: 'Geocoding service unavailable',
                    data: {
                      details: geoError.message,
                    },
                  },
                };
                return res.json(errorResponse);
              }
            }

            // Continue with weather API call for tools/call
            break;

          default:
            const errorResponse = {
              jsonrpc: '2.0',
              id: mcpContext.id,
              error: {
                code: -32601,
                message: `Method not found: ${method}`,
                data: {
                  availableMethods: ['initialize', 'tools/list', 'tools/call'],
                },
              },
            };
            return res.json(errorResponse);
        }
      }

      // Extract endpoint and params from context
      const { endpointName, queryParams, authHeaders } = mcpContext.input || {};

      if (!endpointName || !endpoints[endpointName]) {
        if (mcpContext.metadata?.format === 'jsonrpc') {
          const errorResponse = {
            jsonrpc: '2.0',
            id: mcpContext.id,
            error: {
              code: -32602,
              message: 'Invalid or missing endpoint',
              data: {
                availableEndpoints: Object.keys(endpoints),
              },
            },
          };
          return res.json(errorResponse);
        }

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

      // Build the response based on request format
      let response;
      if (mcpContext.metadata?.format === 'jsonrpc') {
        // JSON-RPC 2.0 response format
        const locationName =
          mcpContext.input.queryParams?.location_name ||
          mcpContext.input.queryParams?.location ||
          'Unknown Location';

        const current = transformedData.current;
        const location = transformedData.location;

        let weatherText = `🌤️ **Weather for ${locationName}**\n\n`;

        if (current) {
          weatherText += `🌡️ **Temperature:** ${current.temperature}°C\n`;
          weatherText += `💨 **Wind:** ${current.windspeed} km/h, ${current.winddirection}°\n`;
          weatherText += `⏰ **Time:** ${current.time}\n`;
          weatherText += `📍 **Coordinates:** ${location.latitude}°, ${location.longitude}°\n`;
          weatherText += `🕐 **Timezone:** ${location.timezone}\n`;
        } else {
          weatherText += '❌ No current weather data available\n';
        }

        if (transformedData.forecast) {
          weatherText += '\n📅 **Forecast:**\n';
          const forecast = transformedData.forecast;
          for (let i = 0; i < Math.min(3, forecast.dates?.length || 0); i++) {
            const date = forecast.dates[i];
            const maxTemp = forecast.temperatures_max[i];
            const minTemp = forecast.temperatures_min[i];
            weatherText += `• ${date}: ${minTemp}°C - ${maxTemp}°C\n`;
          }
        }

        response = {
          jsonrpc: '2.0',
          id: mcpContext.id,
          result: {
            content: [
              {
                type: 'text',
                text: weatherText,
              },
            ],
          },
        };
      } else {
        // Legacy MCP format response
        response = buildMCPResponse(mcpContext, transformedData, endpointName);
      }

      logger.info(`Successfully processed MCP request for: ${endpointName}`);
      res.json(response);
    } catch (err) {
      logger.error('Error processing MCP request:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
      });

      // Build error response based on request format
      let errorResponse;
      const isJsonRpc = mcpContext?.metadata?.format === 'jsonrpc';

      if (isJsonRpc) {
        // JSON-RPC 2.0 error response format
        let errorCode = -32000; // Server error
        let errorMessage = 'Internal server error';

        if (err.code === 'ECONNABORTED') {
          errorCode = -32001;
          errorMessage = 'Request timeout - External API request timed out';
        } else if (err.response) {
          errorCode = -32002;
          errorMessage = `External API error - API returned ${err.response.status}: ${err.response.statusText}`;
        }

        errorResponse = {
          jsonrpc: '2.0',
          id: mcpContext?.id || null,
          error: {
            code: errorCode,
            message: errorMessage,
            data: {
              details: err.message,
              endpoint: mcpContext?.input?.endpointName,
            },
          },
        };

        return res.status(200).json(errorResponse); // JSON-RPC errors use 200 status
      }

      // Legacy error response format
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
