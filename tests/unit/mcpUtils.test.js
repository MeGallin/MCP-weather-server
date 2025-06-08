import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  buildMCPResponse,
  buildMCPErrorResponse,
  isValidMCPContext,
} from '../../utils/mcpUtils.js';

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MCP Utils', () => {
  let mockContext;
  let mockData;

  beforeEach(() => {
    mockContext = {
      input: {
        endpointName: 'getWeather',
        queryParams: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      },
      tools: [],
      metadata: {
        session_id: 'test-session',
      },
    };

    mockData = {
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
      },
      current: {
        temperature: 22.5,
        windspeed: 10.2,
        weathercode: 3,
      },
    };
  });

  describe('buildMCPResponse', () => {
    test('should build valid MCP response', () => {
      const result = buildMCPResponse(mockContext, mockData, 'getWeather');

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('metadata');

      expect(result.input).toEqual(mockContext.input);
      expect(result.tools).toHaveLength(1);

      const toolCall = result.tools[0];
      expect(toolCall.name).toBe('fetch_endpoint');
      expect(toolCall.output.success).toBe(true);
      expect(toolCall.output.data).toEqual(mockData);
      expect(toolCall.output.metadata.endpoint).toBe('getWeather');
    });

    test('should preserve existing tools', () => {
      const contextWithTools = {
        ...mockContext,
        tools: [
          {
            name: 'previous_tool',
            output: { data: 'previous data' },
            timestamp: '2025-06-08T10:00:00Z',
          },
        ],
      };

      const result = buildMCPResponse(contextWithTools, mockData, 'getWeather');

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('previous_tool');
      expect(result.tools[1].name).toBe('fetch_endpoint');
    });

    test('should add metadata correctly', () => {
      const result = buildMCPResponse(mockContext, mockData, 'getWeather');

      expect(result.metadata.last_updated).toBeDefined();
      expect(result.metadata.tool_count).toBe(1);
      expect(result.metadata.last_endpoint).toBe('getWeather');
      expect(result.metadata.session_id).toBe('test-session'); // preserved
    });

    test('should include data size in metadata', () => {
      const result = buildMCPResponse(mockContext, mockData, 'getWeather');

      const toolCall = result.tools[0];
      expect(toolCall.output.metadata.dataSize).toBeDefined();
      expect(typeof toolCall.output.metadata.dataSize).toBe('number');
      expect(toolCall.output.metadata.dataSize).toBeGreaterThan(0);
    });

    test('should include timestamp', () => {
      const result = buildMCPResponse(mockContext, mockData, 'getWeather');

      const toolCall = result.tools[0];
      expect(toolCall.timestamp).toBeDefined();
      expect(toolCall.output.metadata.timestamp).toBeDefined();

      // Should be valid ISO string
      expect(() => new Date(toolCall.timestamp)).not.toThrow();
    });

    test('should handle empty metadata', () => {
      const contextWithoutMeta = {
        input: mockContext.input,
        tools: [],
      };

      const result = buildMCPResponse(
        contextWithoutMeta,
        mockData,
        'getWeather',
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata.last_updated).toBeDefined();
      expect(result.metadata.tool_count).toBe(1);
    });

    test('should handle large data objects', () => {
      const largeData = {
        users: Array(1000)
          .fill()
          .map((_, i) => ({
            id: i,
            name: `User ${i}`,
            data: 'x'.repeat(100),
          })),
      };

      const result = buildMCPResponse(mockContext, largeData, 'getUsers');

      expect(result.tools[0].output.data).toEqual(largeData);
      expect(result.tools[0].output.metadata.dataSize).toBeGreaterThan(100000);
    });
  });

  describe('buildMCPErrorResponse', () => {
    test('should build error response', () => {
      const errorMessage = 'API request failed';
      const result = buildMCPErrorResponse(
        mockContext,
        errorMessage,
        'getWeather',
      );

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('tools');
      expect(result).toHaveProperty('metadata');

      const toolCall = result.tools[0];
      expect(toolCall.name).toBe('fetch_endpoint');
      expect(toolCall.output.success).toBe(false);
      expect(toolCall.output.error).toBe(errorMessage);
      expect(toolCall.output.metadata.endpoint).toBe('getWeather');
    });

    test('should preserve context and add error metadata', () => {
      const errorMessage = 'Network timeout';
      const result = buildMCPErrorResponse(
        mockContext,
        errorMessage,
        'getWeather',
      );

      expect(result.input).toEqual(mockContext.input);
      expect(result.metadata.last_error).toBe(errorMessage);
      expect(result.metadata.last_endpoint).toBe('getWeather');
      expect(result.metadata.last_updated).toBeDefined();
    });

    test('should handle multiple errors', () => {
      let result = buildMCPErrorResponse(
        mockContext,
        'First error',
        'endpoint1',
      );
      result = buildMCPErrorResponse(result, 'Second error', 'endpoint2');

      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].output.error).toBe('First error');
      expect(result.tools[1].output.error).toBe('Second error');
      expect(result.metadata.last_error).toBe('Second error');
    });

    test('should include timestamp in error', () => {
      const result = buildMCPErrorResponse(
        mockContext,
        'Test error',
        'getWeather',
      );

      const toolCall = result.tools[0];
      expect(toolCall.timestamp).toBeDefined();
      expect(toolCall.output.metadata.timestamp).toBeDefined();

      // Should be valid ISO string
      expect(() => new Date(toolCall.timestamp)).not.toThrow();
    });
  });

  describe('isValidMCPContext', () => {
    test('should validate correct MCP context', () => {
      const validContext = {
        input: {
          endpointName: 'getWeather',
        },
        tools: [],
        metadata: {},
      };

      expect(isValidMCPContext(validContext)).toBe(true);
    });

    test('should accept context without tools', () => {
      const contextWithoutTools = {
        input: {
          endpointName: 'getWeather',
        },
        metadata: {},
      };

      expect(isValidMCPContext(contextWithoutTools)).toBe(true);
    });

    test('should accept context without metadata', () => {
      const contextWithoutMeta = {
        input: {
          endpointName: 'getWeather',
        },
        tools: [],
      };

      expect(isValidMCPContext(contextWithoutMeta)).toBe(true);
    });

    test('should reject context without input', () => {
      const invalidContext = {
        tools: [],
        metadata: {},
      };

      expect(isValidMCPContext(invalidContext)).toBe(false);
    });

    test('should reject non-object context', () => {
      expect(isValidMCPContext(null)).toBe(false);
      expect(isValidMCPContext(undefined)).toBe(false);
      expect(isValidMCPContext('string')).toBe(false);
      expect(isValidMCPContext(123)).toBe(false);
    });

    test('should reject context with invalid tools', () => {
      const invalidContext = {
        input: { endpointName: 'test' },
        tools: 'not an array',
        metadata: {},
      };

      expect(isValidMCPContext(invalidContext)).toBe(false);
    });

    test('should reject context with invalid metadata', () => {
      const invalidContext = {
        input: { endpointName: 'test' },
        tools: [],
        metadata: 'not an object',
      };

      expect(isValidMCPContext(invalidContext)).toBe(false);
    });

    test('should accept minimal valid context', () => {
      const minimalContext = {
        input: {},
      };

      expect(isValidMCPContext(minimalContext)).toBe(true);
    });

    test('should handle complex nested context', () => {
      const complexContext = {
        input: {
          endpointName: 'getWeather',
          queryParams: {
            latitude: 40.7128,
            longitude: -74.006,
            nested: {
              deep: {
                value: 'test',
              },
            },
          },
        },
        tools: [
          {
            name: 'previous_tool',
            input: { data: 'input' },
            output: {
              success: true,
              data: { complex: 'data structure' },
            },
            metadata: { timestamp: '2025-06-08T10:00:00Z' },
          },
        ],
        metadata: {
          session_id: 'complex-session',
          user_context: {
            preferences: ['weather', 'temperature'],
          },
        },
      };

      expect(isValidMCPContext(complexContext)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty data in buildMCPResponse', () => {
      const result = buildMCPResponse(mockContext, {}, 'getWeather');

      expect(result.tools[0].output.data).toEqual({});
      expect(result.tools[0].output.metadata.dataSize).toBe(2); // "{}"
    });

    test('should handle null data in buildMCPResponse', () => {
      const result = buildMCPResponse(mockContext, null, 'getWeather');

      expect(result.tools[0].output.data).toBeNull();
      expect(result.tools[0].output.metadata.dataSize).toBe(4); // "null"
    });

    test('should handle circular references in data', () => {
      const circularData = { name: 'test' };
      circularData.self = circularData;

      // Should not throw an error
      expect(() => {
        buildMCPResponse(mockContext, circularData, 'getWeather');
      }).toThrow(); // JSON.stringify will throw on circular references
    });

    test('should handle very long endpoint names', () => {
      const longEndpointName = 'a'.repeat(1000);
      const result = buildMCPResponse(mockContext, mockData, longEndpointName);

      expect(result.tools[0].output.metadata.endpoint).toBe(longEndpointName);
      expect(result.metadata.last_endpoint).toBe(longEndpointName);
    });

    test('should handle special characters in endpoint names', () => {
      const specialEndpoint = 'get-weather_v2.0@test!';
      const result = buildMCPResponse(mockContext, mockData, specialEndpoint);

      expect(result.tools[0].output.metadata.endpoint).toBe(specialEndpoint);
      expect(result.metadata.last_endpoint).toBe(specialEndpoint);
    });
  });
});
