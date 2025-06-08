import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock logger
jest.mock('../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logAuth: jest.fn(),
  logAPIPerformance: jest.fn()
}));

// Mock axios
const axiosGet = jest.fn();
jest.mock('axios', () => ({
  default: {
    get: axiosGet,
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn().mockReturnThis(),
    defaults: { headers: {} }
  }
}));

// Import controller after mocks
import mcpController from '../../../controllers/mcpController.js';

describe('MCP Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/mcp', mcpController.handleMCPRequest);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

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

    axiosGet.mockResolvedValue({ data: mockWeatherData });

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

    // Check if axiosGet was called
    expect(axiosGet).toHaveBeenCalled();
    
    expect(response.body).toHaveProperty('input');
    expect(response.body).toHaveProperty('tools');
    expect(response.body).toHaveProperty('metadata');
    
    expect(response.body.tools).toHaveLength(1);
    expect(response.body.tools[0].name).toBe('fetch_endpoint');
    expect(response.body.tools[0].output.success).toBe(true);
    expect(response.body.tools[0].output.data.location.latitude).toBe(40.7128);
  });
});
