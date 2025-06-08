#!/usr/bin/env node

/**
 * MCP Weather Server - Stdio Transport Wrapper
 *
 * This file creates a Model Context Protocol (MCP) server that wraps
 * our existing weather API functionality for use with VS Code and
 * other MCP-compatible clients via stdio transport.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import our existing weather functionality
import {
  buildMCPResponse,
  buildMCPErrorResponse,
  isValidMCPContext,
} from './utils/mcpUtils.js';
import logger from './utils/logger.js';

/**
 * Validates weather request parameters
 */
function validateWeatherRequest(params) {
  const errors = [];

  if (!params.location || typeof params.location !== 'string') {
    errors.push('Location is required and must be a string');
  }

  if (
    params.units &&
    !['metric', 'imperial', 'kelvin'].includes(params.units)
  ) {
    errors.push('Units must be one of: metric, imperial, kelvin');
  }

  if (
    params.days &&
    (typeof params.days !== 'number' || params.days < 1 || params.days > 5)
  ) {
    errors.push('Days must be a number between 1 and 5');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats weather response data
 */
function formatWeatherResponse(data, options = {}) {
  const { units = 'metric' } = options;

  // Add units information to the response
  const formattedData = {
    ...data,
    units: units,
    formatted_at: new Date().toISOString(),
  };

  // Convert temperatures if needed
  if (units === 'imperial' && data.current?.temperature) {
    formattedData.current.temperature = Math.round(
      (data.current.temperature * 9) / 5 + 32,
    );
  } else if (units === 'kelvin' && data.current?.temperature) {
    formattedData.current.temperature = Math.round(
      data.current.temperature + 273.15,
    );
  }

  return formattedData;
}

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: 'weather-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * Weather API tool implementations
 */
const weatherTools = {
  'get-current-weather': {
    name: 'get-current-weather',
    description: 'Get current weather conditions for a specified location',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description:
            'City name, state/country (e.g., "New York, NY" or "London, UK")',
        },
        units: {
          type: 'string',
          description:
            'Temperature units: metric (Celsius), imperial (Fahrenheit), or kelvin',
          enum: ['metric', 'imperial', 'kelvin'],
          default: 'metric',
        },
      },
      required: ['location'],
    },
  },
  'get-weather-forecast': {
    name: 'get-weather-forecast',
    description: 'Get weather forecast for a specified location (up to 5 days)',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description:
            'City name, state/country (e.g., "New York, NY" or "London, UK")',
        },
        days: {
          type: 'number',
          description: 'Number of forecast days (1-5)',
          minimum: 1,
          maximum: 5,
          default: 3,
        },
        units: {
          type: 'string',
          description:
            'Temperature units: metric (Celsius), imperial (Fahrenheit), or kelvin',
          enum: ['metric', 'imperial', 'kelvin'],
          default: 'metric',
        },
      },
      required: ['location'],
    },
  },
  'get-weather-alerts': {
    name: 'get-weather-alerts',
    description: 'Get weather alerts and warnings for a specified location',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description:
            'City name, state/country (e.g., "New York, NY" or "London, UK")',
        },
      },
      required: ['location'],
    },
  },
};

/**
 * Mock weather data for demonstration
 * In production, this would connect to a real weather API
 */
function getMockWeatherData(location, type = 'current') {
  const baseData = {
    location: location,
    timestamp: new Date().toISOString(),
    source: 'MCP Weather Server v2.0',
  };

  switch (type) {
    case 'current':
      return {
        ...baseData,
        current: {
          temperature: 22,
          humidity: 65,
          windSpeed: 10,
          condition: 'Partly Cloudy',
          description: 'Partly cloudy with light winds',
        },
      };

    case 'forecast':
      return {
        ...baseData,
        forecast: [
          {
            date: new Date().toISOString().split('T')[0],
            high: 24,
            low: 18,
            condition: 'Partly Cloudy',
            precipitation: 10,
          },
          {
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            high: 26,
            low: 20,
            condition: 'Sunny',
            precipitation: 0,
          },
          {
            date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
            high: 23,
            low: 17,
            condition: 'Light Rain',
            precipitation: 80,
          },
        ],
      };

    case 'alerts':
      return {
        ...baseData,
        alerts: [
          {
            title: 'High Wind Warning',
            severity: 'moderate',
            description: 'Winds may reach 45-55 mph with gusts up to 65 mph',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 21600000).toISOString(),
          },
        ],
      };

    default:
      return baseData;
  }
}

/**
 * Handle tool execution
 */
async function handleToolCall(name, arguments_) {
  try {
    logger.info(`Executing tool: ${name}`, { arguments: arguments_ });

    // Validate the request
    const validation = validateWeatherRequest(arguments_);
    if (!validation.isValid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    const { location, units = 'metric', days = 3 } = arguments_;

    let result;
    switch (name) {
      case 'get-current-weather':
        result = getMockWeatherData(location, 'current');
        break;

      case 'get-weather-forecast':
        result = getMockWeatherData(location, 'forecast');
        // Limit forecast days as requested
        if (result.forecast && days < result.forecast.length) {
          result.forecast = result.forecast.slice(0, days);
        }
        break;

      case 'get-weather-alerts':
        result = getMockWeatherData(location, 'alerts');
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Format the response
    const formattedResult = formatWeatherResponse(result, { units });

    logger.info(`Tool executed successfully: ${name}`, {
      location,
      result: formattedResult,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResult, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, {
      error: error.message,
      arguments: arguments_,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message,
              tool: name,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Register MCP handlers
 */

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Listing available tools');
  return {
    tools: Object.values(weatherTools),
  };
});

// Execute tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: arguments_ } = request.params;
  logger.info(`Tool call received: ${name}`, { arguments: arguments_ });

  return await handleToolCall(name, arguments_ || {});
});

/**
 * Start the server
 */
async function main() {
  try {
    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    logger.info('MCP Weather Server started successfully via stdio transport');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down MCP Weather Server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start MCP Weather Server', {
      error: error.message,
    });
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { server, weatherTools, handleToolCall };
