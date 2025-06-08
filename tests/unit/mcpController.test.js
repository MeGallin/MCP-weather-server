import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock axios using unstable_mockModule for ES modules
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn().mockReturnThis();

jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    create: mockCreate,
    defaults: { headers: {} }
  }
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logAuth: jest.fn(),
  logAPIPerformance: jest.fn()
}));

// Import controller AFTER mocks
const mcpController = await import('../../controllers/mcpController.js');
const mcpControllerDefault = mcpController.default;

describe('MCP Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/mcp', mcpControllerDefault.handleMCPRequest);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Valid MCP Requests', () => {
    test('should handle valid weather request', async () => {
      const mockWeatherData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        current_weather: {
          temperature: 22.5,
          windspeed: 10.2,
          winddirection: 180,
          weathercode: 3,
          time: '2025-06-08T14:00'
        },
        daily: {
          time: ['2025-06-08', '2025-06-09'],
          temperature_2m_max: [25.0, 23.0],
          temperature_2m_min: [18.0, 16.0],
          weathercode: [3, 1]
        }
      };

      mockGet.mockResolvedValue({ data: mockWeatherData });

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        tools: [],
        metadata: {}
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      // Check if mockGet was called
      expect(mockGet).toHaveBeenCalled();
      
      expect(response.body).toHaveProperty('input');
      expect(response.body).toHaveProperty('tools');
      expect(response.body).toHaveProperty('metadata');
      
      expect(response.body.tools).toHaveLength(1);
      expect(response.body.tools[0].name).toBe('fetch_endpoint');
      expect(response.body.tools[0].output.success).toBe(true);
      expect(response.body.tools[0].output.data.location.latitude).toBe(40.7128);
    });

    test('should handle getCurrentWeather request', async () => {
      const mockCurrentWeather = {
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        current_weather: {
          temperature: 18.5,
          windspeed: 8.7,
          winddirection: 220,
          weathercode: 1,
          time: '2025-06-08T14:00'
        }
      };

      mockGet.mockResolvedValue({ data: mockCurrentWeather });

      const mcpRequest = {
        input: {
          endpointName: 'getCurrentWeather',
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

      expect(response.body.tools[0].output.data.location.latitude).toBe(51.5074);
      expect(response.body.tools[0].output.data.current.temperature).toBe(18.5);
    });

    test('should handle getUsers request', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          address: { city: 'New York' }
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          address: { city: 'London' }
        }
      ];

      mockGet.mockResolvedValue({ data: mockUsers });

      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body.tools[0].output.data).toHaveLength(2);
      expect(response.body.tools[0].output.data[0].id).toBe(1);
      expect(response.body.tools[0].output.data[0].city).toBe('New York');
    });

    test('should handle getPosts request', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post',
          body: 'Test content',
          userId: 1
        }
      ];

      mockGet.mockResolvedValue({ data: mockPosts });

      const mcpRequest = {
        input: {
          endpointName: 'getPosts'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body.tools[0].output.data).toEqual(mockPosts);
    });

    test('should merge default parameters with query parameters', async () => {
      const mockWeatherData = {
        latitude: 40.7128,
        longitude: -74.0060,
        current_weather: { temperature: 22.5 }
      };

      mockGet.mockResolvedValue({ data: mockWeatherData });

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060,
            temperature_unit: 'fahrenheit'
          }
        }
      };

      await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      // Verify that axios was called with merged parameters
      expect(mockGet).toHaveBeenCalledWith(
        'https://api.open-meteo.com/v1/forecast',
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 40.7128,
            longitude: -74.0060,
            current_weather: true, // from default params
            daily: 'temperature_2m_max,temperature_2m_min,weathercode', // from default params
            temperature_unit: 'fahrenheit' // from query params
          })
        })
      );
    });

    test('should include auth headers when provided', async () => {
      const mockData = [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          address: { city: 'Test City' }
        }
      ];
      mockGet.mockResolvedValue({ data: mockData });

      const mcpRequest = {
        input: {
          endpointName: 'getUsers',
          authHeaders: {
            'Authorization': 'Bearer test-token',
            'X-API-Key': 'test-key'
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest);
      
      expect(response.status).toBe(200);

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'X-API-Key': 'test-key',
            'User-Agent': 'MCP-Weather-Server/1.0.0'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should reject invalid MCP request format', async () => {
      const invalidRequest = {
        // Missing required 'input' field
        tools: [],
        metadata: {}
      };

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid MCP request');
      expect(response.body.details).toBeDefined();
    });

    test('should reject invalid endpointName', async () => {
      const invalidRequest = {
        input: {
          endpointName: 'nonexistentEndpoint', // Invalid endpointName
          queryParams: {}
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid or missing endpointName');
      expect(response.body.availableEndpoints).toBeDefined();
    });

    test('should reject unknown endpoint', async () => {
      const invalidRequest = {
        input: {
          endpointName: 'unknownEndpoint'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid or missing endpointName');
      expect(response.body.availableEndpoints).toContain('getWeather');
      expect(response.body.availableEndpoints).toContain('getCurrentWeather');
    });

    test('should handle external API timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockGet.mockRejectedValue(timeoutError);

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(408);

      expect(response.body.error).toBe('Request timeout');
      expect(response.body.details).toBe('External API request timed out');
    });

    test('should handle external API error response', async () => {
      const apiError = new Error('API Error');
      apiError.response = {
        status: 503,
        statusText: 'Service Unavailable'
      };
      
      mockGet.mockRejectedValue(apiError);

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(502);

      expect(response.body.error).toBe('External API error');
      expect(response.body.details).toContain('503: Service Unavailable');
    });

    test('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockGet.mockRejectedValue(genericError);

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.details).toBe('Something went wrong');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle malformed JSON before it reaches our controller
    });
  });

  describe('Data Transformation', () => {
    test('should transform weather data correctly', async () => {
      const mockWeatherData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        current_weather: {
          temperature: 22.5,
          windspeed: 10.2,
          winddirection: 180,
          weathercode: 3,
          time: '2025-06-08T14:00'
        },
        daily: {
          time: ['2025-06-08', '2025-06-09'],
          temperature_2m_max: [25.0, 23.0],
          temperature_2m_min: [18.0, 16.0],
          weathercode: [3, 1]
        }
      };

      mockGet.mockResolvedValue({ data: mockWeatherData });

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const transformedData = response.body.tools[0].output.data;
      
      expect(transformedData).toHaveProperty('location');
      expect(transformedData).toHaveProperty('current');
      expect(transformedData).toHaveProperty('forecast');
      
      expect(transformedData.location.latitude).toBe(40.7128);
      expect(transformedData.current.temperature).toBe(22.5);
      expect(transformedData.forecast.dates).toEqual(['2025-06-08', '2025-06-09']);
    });

    test('should transform user data correctly', async () => {
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          username: 'john_doe',
          phone: '123-456-7890',
          address: { 
            city: 'New York',
            street: '123 Main St',
            zipcode: '10001'
          },
          company: { name: 'ACME Corp' }
        }
      ];

      mockGet.mockResolvedValue({ data: mockUsers });

      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      const transformedData = response.body.tools[0].output.data;
      
      expect(transformedData[0]).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        city: 'New York'
      });
      
      // Verify that unnecessary fields are filtered out
      expect(transformedData[0]).not.toHaveProperty('username');
      expect(transformedData[0]).not.toHaveProperty('phone');
      expect(transformedData[0]).not.toHaveProperty('address');
      expect(transformedData[0]).not.toHaveProperty('company');
    });

    test('should not transform data when no transformer exists', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post',
          body: 'Test content',
          userId: 1
        }
      ];

      mockGet.mockResolvedValue({ data: mockPosts });

      const mcpRequest = {
        input: {
          endpointName: 'getPosts'
        }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      // Posts endpoint has no transformer, so data should be unchanged
      expect(response.body.tools[0].output.data).toEqual(mockPosts);
    });
  });

  describe('Performance and Timeout', () => {
    test('should respect timeout configuration', async () => {
      mockGet.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      );

      const mcpRequest = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      };

      // The request should timeout (configured for 10 seconds)
      // Note: In a real test, this would timeout, but mocked axios won't actually timeout
      await request(app)
        .post('/mcp')
        .send(mcpRequest);

      // Verify timeout was set in axios config
      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000
        })
      );
    }, 20000); // 20 second timeout for this test

    test('should include User-Agent header', async () => {
      mockGet.mockResolvedValue({ data: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          address: { city: 'Test City' }
        }
      ] });

      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        }
      };

      await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'MCP-Weather-Server/1.0.0'
          })
        })
      );
    });
  });

  describe('Context Preservation', () => {
    test('should preserve original input in response', async () => {
      mockGet.mockResolvedValue({ data: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          address: { city: 'Test City' }
        }
      ] });

      const originalInput = {
        endpointName: 'getUsers',
        queryParams: { _limit: 5 },
        customField: 'preserved'
      };

      const mcpRequest = {
        input: originalInput,
        tools: [],
        metadata: { session: 'test' }
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body.input).toEqual(originalInput);
    });

    test('should preserve existing tools and metadata', async () => {
      mockGet.mockResolvedValue({ data: [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          address: { city: 'Test City' }
        }
      ] });

      const existingTools = [
        {
          name: 'previous_tool',
          output: { data: 'previous' },
          timestamp: '2025-06-08T10:00:00Z'
        }
      ];

      const existingMetadata = {
        session_id: 'test-session',
        user_id: 'test-user'
      };

      const mcpRequest = {
        input: {
          endpointName: 'getUsers'
        },
        tools: existingTools,
        metadata: existingMetadata
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body.tools).toHaveLength(2);
      expect(response.body.tools[0]).toMatchObject({
        name: existingTools[0].name,
        output: existingTools[0].output
      });
      expect(response.body.tools[0].timestamp).toMatch(/2025-06-08T10:00:00/);
      expect(response.body.metadata.session_id).toBe('test-session');
      expect(response.body.metadata.user_id).toBe('test-user');
    });
  });
});
