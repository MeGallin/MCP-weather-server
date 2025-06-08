import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mcpController from '../../controllers/mcpController.js';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler.js';

describe('MCP Weather Server Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Create the full app setup like in index.js
    app = express();
    
    // Security middleware
    app.use(helmet());
    app.use(cors());
    
    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Routes
    app.post('/mcp', mcpController.handleMCPRequest);
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // 404 handler
    app.use(notFoundHandler);
    
    // Global error handler
    app.use(errorHandler);
    
    // Start server
    server = app.listen(0); // Use port 0 for random available port
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('Server Health and Setup', () => {
    test('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
      expect(response.body.message).toContain('/unknown-route');
    });

    test('should handle POST to unknown routes', async () => {
      const response = await request(app)
        .post('/unknown-endpoint')
        .send({ test: 'data' })
        .expect(404);

      expect(response.body.error).toBe('Route not found');
    });
  });

  describe('Real Weather API Integration', () => {
    test('should fetch real weather data for New York', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        tools: [],
        metadata: {
          test: 'integration',
          location: 'New York'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      // Validate MCP response structure
      expect(response.body).toHaveProperty('input');
      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('metadata');
      
      // Validate tool call
      expect(response.body.tools).toHaveLength(1);
      const toolCall = response.body.tools[0];
      expect(toolCall.name).toBe('fetch_endpoint');
      expect(toolCall.output.success).toBe(true);
      
      // Validate weather data structure
      const weatherData = toolCall.output.data;
      expect(weatherData).toHaveProperty('location');
      expect(weatherData).toHaveProperty('current');
        expect(weatherData.location.latitude).toBeCloseTo(40.7128, 1);
      expect(weatherData.location.longitude).toBeCloseTo(-74.0060, 1);
      expect(weatherData.location.timezone).toBeDefined();
      
      expect(weatherData.current).toBeDefined();
      expect(typeof weatherData.current.temperature).toBe('number');
      expect(typeof weatherData.current.windspeed).toBe('number');
      expect(typeof weatherData.current.weathercode).toBe('number');
      
      // Validate metadata
      expect(toolCall.output.metadata.endpoint).toBe('getCurrentWeather');
      expect(toolCall.output.metadata.timestamp).toBeDefined();
      expect(toolCall.output.metadata.dataSize).toBeGreaterThan(0);
    }, 10000); // 10 second timeout for real API call

    test('should fetch weather forecast for London', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 51.5074,
            longitude: -0.1278
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const weatherData = response.body.tools[0].output.data;
        expect(weatherData.location.latitude).toBeCloseTo(51.5074, 1);
      expect(weatherData.location.longitude).toBeCloseTo(-0.1278, 1);
      expect(weatherData.current).toBeDefined();
      expect(weatherData.forecast).toBeDefined();
      
      // Validate forecast structure
      expect(Array.isArray(weatherData.forecast.dates)).toBe(true);
      expect(weatherData.forecast.dates.length).toBeGreaterThan(0);
      expect(Array.isArray(weatherData.forecast.temperatures_max)).toBe(true);
      expect(Array.isArray(weatherData.forecast.temperatures_min)).toBe(true);
    }, 10000);

    test('should handle different temperature units', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060,
            temperature_unit: 'fahrenheit'
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const weatherData = response.body.tools[0].output.data;
      expect(weatherData.current.temperature).toBeDefined();
      // Temperature should be in Fahrenheit range (typically higher numbers)
    }, 10000);
  });

  describe('Real External API Integration', () => {
    test('should fetch real user data from JSONPlaceholder', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const userData = response.body.tools[0].output.data;
      
      expect(Array.isArray(userData)).toBe(true);
      expect(userData.length).toBeGreaterThan(0);
      
      // Validate transformed user structure
      const user = userData[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('city');
      
      // Verify transformation worked (removed unnecessary fields)
      expect(user).not.toHaveProperty('username');
      expect(user).not.toHaveProperty('phone');
      expect(user).not.toHaveProperty('address');
    }, 10000);

    test('should fetch real post data from JSONPlaceholder', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getPosts'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const postData = response.body.tools[0].output.data;
      
      expect(Array.isArray(postData)).toBe(true);
      expect(postData.length).toBeGreaterThan(0);
      
      const post = postData[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('body');
      expect(post).toHaveProperty('userId');
    }, 10000);
  });

  describe('Error Scenarios Integration', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 95, // Invalid latitude
            longitude: -74.0060
          }
        }
      };

      // The API might accept this and return an error, or our validation might catch it
      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest);      // Should either be a 400 (validation error) or 502 (API error)
      expect([400, 502].includes(response.status)).toBe(true);
    }, 10000);

    test('should handle network-like errors', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 0,
            longitude: 0
          }
        }
      };

      // This should work but might return empty/null data
      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest);

      // Should succeed (coordinates are valid)
      expect(response.status).toBe(200);
    }, 10000);
  });

  describe('MCP Context Chain Integration', () => {
    test('should handle chained MCP requests', async () => {
      // First request
      const firstRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        tools: [],
        metadata: {
          session_id: 'chain-test',
          step: 1
        }
      };

      const firstResponse = await request(app)
        .post('/mcp')
        .send(firstRequest)
        .expect(200);

      // Second request using context from first
      const secondRequest = {
        input: {
          endpointName: 'getUsers'
        },
        tools: firstResponse.body.tools,
        metadata: {
          ...firstResponse.body.metadata,
          step: 2
        }
      };

      const secondResponse = await request(app)
        .post('/mcp')
        .send(secondRequest)
        .expect(200);

      // Should have tools from both requests
      expect(secondResponse.body.tools).toHaveLength(2);
      expect(secondResponse.body.tools[0].output.metadata.endpoint).toBe('getCurrentWeather');
      expect(secondResponse.body.tools[1].output.metadata.endpoint).toBe('getUsers');
      
      // Metadata should be preserved and updated
      expect(secondResponse.body.metadata.session_id).toBe('chain-test');
      expect(secondResponse.body.metadata.step).toBe(2);
      expect(secondResponse.body.metadata.tool_count).toBe(2);
    }, 15000);
  });

  describe('Large Payload Handling', () => {
    test('should handle large user datasets', async () => {
      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      // Validate response size and structure
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeGreaterThan(1000); // Should be reasonably sized
      
      const toolCall = response.body.tools[0];
      expect(toolCall.output.metadata.dataSize).toBeDefined();
      expect(toolCall.output.metadata.dataSize).toBeGreaterThan(0);
    }, 10000);

    test('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill().map((_, index) => {
        return request(app)
          .post('/mcp')
          .send({
            input: {
              endpointName: 'getCurrentWeather',
              queryParams: {
                latitude: 40.7128 + (index * 0.1),
                longitude: -74.0060 + (index * 0.1)
              }
            },
            metadata: { request_id: index }
          });
      });

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.tools[0].output.success).toBe(true);
          // Each should have different coordinates  
        const lat = response.body.tools[0].output.data.location.latitude;
        expect(lat).toBeCloseTo(40.7128 + (index * 0.1), 1);
      });
    }, 20000);
  });

  describe('Content Type and Headers', () => {
    test('should require JSON content type for MCP endpoint', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });

    test('should set appropriate response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Should have security headers from helmet
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Request Size Limits', () => {
    test('should accept requests within size limit', async () => {
      const largeButValidRequest = {
        input: {
          endpointName: 'getCurrentWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        metadata: {
          // Add some bulk but stay under 10MB limit
          bulkData: 'x'.repeat(1000)
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(largeButValidRequest)
        .expect(200);

      expect(response.body.tools[0].output.success).toBe(true);
    });

    // Note: Testing actual 10MB+ requests would be slow and might cause issues
    // In a real test suite, you might want to lower the limit for testing
  });
});
