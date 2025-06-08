# MCP Weather Server - Product Requirements Document

## Overview

The MCP Weather Server is a Node.js/Express-based application that implements the Model Context Protocol (MCP) standard for fetching data from external HTTP endpoints. The server acts as a bridge between MCP-compatible clients and various data sources, with a primary focus on weather data retrieval.

## Product Vision

To provide a lightweight, extensible MCP server that enables seamless integration between AI agents/LLMs and external data sources, starting with weather data but expandable to any HTTP-based API.

## Core Functionality

### Input

- An MCP context (JSON) via POST request
- Could be direct user input or agent instruction
- Structured according to MCP protocol specifications

### Processing

- Server extracts instructions/context from the incoming request
- Fetches data from a configurable HTTP endpoint
- Updates the MCP context with the fetched result
- Applies proper error handling and validation

### Output

- Updated MCP context, returned as JSON
- Follows MCP protocol conventions for tool results
- Includes metadata and timestamps for tracking

## Target Users

- AI/ML developers building agent systems
- LLM application developers
- Data integration specialists
- Weather application developers

## Success Metrics

- Response time < 2 seconds for typical weather API calls
- 99.9% uptime for the server
- Support for at least 5 different endpoint types
- Error rate < 1% for valid requests

## Requirements

### Functional Requirements

#### FR1: MCP Protocol Compliance

- **Description**: The server must fully comply with the Model Context Protocol standard
- **Priority**: High
- **Acceptance Criteria**:
  - Accept MCP context as JSON input
  - Return properly formatted MCP responses
  - Maintain tool call history and metadata
  - Support context chaining for multi-step operations

#### FR2: HTTP Endpoint Integration

- **Description**: Support for configurable HTTP endpoints
- **Priority**: High
- **Acceptance Criteria**:
  - Configure endpoints via configuration file
  - Support GET requests with query parameters
  - Handle various response formats (JSON, XML, etc.)
  - Support authentication methods (API keys, Bearer tokens)

#### FR3: Weather Data Integration

- **Description**: Primary integration with weather APIs
- **Priority**: High
- **Acceptance Criteria**:
  - Integration with Open-Meteo API
  - Support location-based weather queries
  - Handle forecast and current weather data
  - Support multiple weather parameters (temperature, humidity, wind, etc.)

#### FR4: Error Handling

- **Description**: Comprehensive error handling and logging
- **Priority**: High
- **Acceptance Criteria**:
  - Validate incoming MCP requests
  - Handle external API failures gracefully
  - Return structured error responses
  - Log errors for debugging purposes

#### FR5: Extensibility

- **Description**: Easy addition of new endpoints and data sources
- **Priority**: Medium
- **Acceptance Criteria**:
  - Plugin-based architecture for new endpoints
  - Configuration-driven endpoint management
  - Support for custom data transformations
  - Documentation for adding new integrations

### Non-Functional Requirements

#### NFR1: Performance

- **Description**: Server must handle requests efficiently
- **Requirements**:
  - Response time < 2 seconds for weather API calls
  - Support for concurrent requests (min 10 simultaneous)
  - Memory usage < 100MB under normal load

#### NFR2: Reliability

- **Description**: High availability and fault tolerance
- **Requirements**:
  - 99.9% uptime target
  - Graceful degradation when external APIs are unavailable
  - Circuit breaker pattern for external API calls

#### NFR3: Security

- **Description**: Secure handling of API keys and requests
- **Requirements**:
  - Secure storage of API credentials
  - Input validation and sanitization
  - Rate limiting to prevent abuse
  - HTTPS support for production deployment

#### NFR4: Maintainability

- **Description**: Code must be maintainable and well-documented
- **Requirements**:
  - Modular architecture with clear separation of concerns
  - Comprehensive inline documentation
  - Unit test coverage > 80%
  - Integration tests for critical paths

## Technical Architecture

### Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Package Manager**: npm
- **Module System**: ES Modules
- **Testing**: Jest (recommended for future implementation)
- **Linting**: ESLint (recommended for future implementation)

### Dependencies

```json
{
  "axios": "^1.6.7", // HTTP client for external API calls
  "express": "^4.19.2", // Web framework
  "joi": "^17.12.0", // Input validation (future enhancement)
  "winston": "^3.11.0" // Logging (future enhancement)
}
```

1. Project Structure## Project Structure

```
/mcp-server
├── index.js                 # Main server entry point
├── package.json             # Project dependencies and scripts
├── package-lock.json        # Dependency lock file
├── README.md               # Project documentation
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── /config
│   ├── endpoints.js        # External API endpoint configurations
│   └── server.js           # Server configuration settings
├── /controllers
│   └── mcpController.js    # MCP request handling logic
├── /utils
│   ├── mcpUtils.js         # MCP protocol utilities
│   ├── validation.js       # Input validation utilities
│   └── logger.js           # Logging utilities
├── /middleware
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Request validation middleware
│   └── errorHandler.js     # Global error handling
├── /services
│   ├── weatherService.js   # Weather API integration
│   └── endpointService.js  # Generic endpoint service
└── /tests
    ├── /unit
    │   ├── mcpController.test.js
    │   └── mcpUtils.test.js
    └── /integration
        └── api.test.js
```

## Implementation Details### Core Files

#### package.json

```json
{
  "name": "mcp-weather-server",
  "version": "1.0.0",
  "description": "MCP server for fetching weather and external API data",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "keywords": ["mcp", "weather", "api", "server", "agent"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.6.7",
    "express": "^4.19.2",
    "joi": "^17.12.0",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "eslint": "^8.57.0",
    "nodemon": "^3.0.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### index.js

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mcpController from './controllers/mcpController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8000;

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

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`MCP server running on port ${PORT}`);
});
```

#### controllers/mcpController.js

```javascript
import axios from 'axios';
import { buildMCPResponse } from '../utils/mcpUtils.js';
import { validateMCPRequest } from '../utils/validation.js';
import endpoints from '../config/endpoints.js';
import { logger } from '../utils/logger.js';

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
      }

      // Prepare request configuration
      const endpointConfig = endpoints[endpointName];
      const requestConfig = {
        params: queryParams,
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
      logger.error('Error processing MCP request:', err);

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
};
```

#### config/endpoints.js

```javascript
// Weather data transformer function
const transformWeatherData = (data) => ({
  location: {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
  },
  current: data.current_weather
    ? {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        winddirection: data.current_weather.winddirection,
        weathercode: data.current_weather.weathercode,
        time: data.current_weather.time,
      }
    : null,
  forecast: data.daily
    ? {
        dates: data.daily.time,
        temperatures_max: data.daily.temperature_2m_max,
        temperatures_min: data.daily.temperature_2m_min,
        weather_codes: data.daily.weathercode,
      }
    : null,
});

export default {
  // Weather endpoints
  getWeather: {
    url: 'https://api.open-meteo.com/v1/forecast',
    description: 'Get weather forecast data',
    transformer: transformWeatherData,
    defaultParams: {
      current_weather: true,
      daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    },
  },

  getCurrentWeather: {
    url: 'https://api.open-meteo.com/v1/current_weather',
    description: 'Get current weather conditions',
    transformer: (data) => ({
      temperature: data.temperature,
      windspeed: data.windspeed,
      winddirection: data.winddirection,
      weathercode: data.weathercode,
      time: data.time,
    }),
  },

  // Test endpoints
  getUsers: {
    url: 'https://jsonplaceholder.typicode.com/users',
    description: 'Get test user data',
    transformer: (data) =>
      data.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        city: user.address.city,
      })),
  },

  getPosts: {
    url: 'https://jsonplaceholder.typicode.com/posts',
    description: 'Get test post data',
  },

  // Add more endpoints as needed
  // Each endpoint can have:
  // - url: the API endpoint URL
  // - description: human-readable description
  // - transformer: optional function to transform the response data
  // - defaultParams: default query parameters
};
```

#### utils/mcpUtils.js

```javascript
import { logger } from './logger.js';

/**
 * Builds an MCP-compliant response with tool results
 * @param {Object} originalContext - The original MCP context
 * @param {Object} fetchedData - Data fetched from external API
 * @param {string} endpointName - Name of the endpoint that was called
 * @returns {Object} Updated MCP context
 */
export function buildMCPResponse(originalContext, fetchedData, endpointName) {
  const now = new Date().toISOString();

  // Create tool result entry (per MCP conventions)
  const toolCall = {
    name: 'fetch_endpoint',
    input: {
      endpoint: endpointName,
      ...originalContext.input,
    },
    output: {
      success: true,
      data: fetchedData,
      metadata: {
        endpoint: endpointName,
        timestamp: now,
        dataSize: JSON.stringify(fetchedData).length,
      },
    },
    timestamp: now,
    duration: 0, // This could be calculated if needed
  };

  // Update context with new tool result
  const updatedContext = {
    ...originalContext,
    tools: [...(originalContext.tools || []), toolCall],
    metadata: {
      ...originalContext.metadata,
      last_updated: now,
      tool_count: (originalContext.tools?.length || 0) + 1,
      last_endpoint: endpointName,
    },
  };

  logger.debug('Built MCP response:', {
    endpointName,
    toolCount: updatedContext.metadata.tool_count,
  });

  return updatedContext;
}

/**
 * Builds an MCP error response
 * @param {Object} originalContext - The original MCP context
 * @param {string} errorMessage - Error message
 * @param {string} endpointName - Name of the endpoint that failed
 * @returns {Object} Updated MCP context with error
 */
export function buildMCPErrorResponse(
  originalContext,
  errorMessage,
  endpointName,
) {
  const now = new Date().toISOString();

  const toolCall = {
    name: 'fetch_endpoint',
    input: {
      endpoint: endpointName,
      ...originalContext.input,
    },
    output: {
      success: false,
      error: errorMessage,
      metadata: {
        endpoint: endpointName,
        timestamp: now,
      },
    },
    timestamp: now,
  };

  return {
    ...originalContext,
    tools: [...(originalContext.tools || []), toolCall],
    metadata: {
      ...originalContext.metadata,
      last_updated: now,
      last_error: errorMessage,
      last_endpoint: endpointName,
    },
  };
}

/**
 * Validates MCP context structure
 * @param {Object} context - MCP context to validate
 * @returns {boolean} True if valid MCP context
 */
export function isValidMCPContext(context) {
  if (!context || typeof context !== 'object') {
    return false;
  }

  // Check required MCP fields
  const hasInput = 'input' in context;
  const hasTools = Array.isArray(context.tools) || context.tools === undefined;
  const hasMetadata =
    typeof context.metadata === 'object' || context.metadata === undefined;

  return hasInput && hasTools && hasMetadata;
}
```

## API Specification

### Endpoints

#### POST /mcp

Primary endpoint for MCP requests.

**Request Body:**

```json
{
  "input": {
    "endpointName": "string (required)",
    "queryParams": "object (optional)",
    "authHeaders": "object (optional)"
  },
  "history": "array (optional)",
  "tools": "array (optional)",
  "metadata": "object (optional)"
}
```

**Response:**

```json
{
  "input": {
    /* original input */
  },
  "history": [
    /* request history */
  ],
  "tools": [
    {
      "name": "fetch_endpoint",
      "input": {
        /* request parameters */
      },
      "output": {
        "success": true,
        "data": {
          /* fetched data */
        },
        "metadata": {
          /* operation metadata */
        }
      },
      "timestamp": "ISO string"
    }
  ],
  "metadata": {
    "last_updated": "ISO string",
    "tool_count": "number",
    "last_endpoint": "string"
  }
}
```

#### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "ISO string"
}
```

## Example Usage Scenarios### Weather Data Retrieval

**Request:**

```bash
POST /mcp
Content-Type: application/json

{
  "input": {
    "endpointName": "getWeather",
    "queryParams": {
      "latitude": 52.52,
      "longitude": 13.41,
      "current_weather": true,
      "daily": "temperature_2m_max,temperature_2m_min"
    }
  },
  "history": [],
  "tools": [],
  "metadata": {
    "user_id": "agent_001",
    "session_id": "weather_session_123"
  }
}
```

**Response:**

```json
{
  "input": {
    /* original input */
  },
  "history": [],
  "tools": [
    {
      "name": "fetch_endpoint",
      "input": {
        "endpoint": "getWeather",
        "endpointName": "getWeather",
        "queryParams": {
          /* weather params */
        }
      },
      "output": {
        "success": true,
        "data": {
          "location": {
            "latitude": 52.52,
            "longitude": 13.41,
            "timezone": "Europe/Berlin"
          },
          "current": {
            "temperature": 22.5,
            "windspeed": 10.2,
            "winddirection": 180,
            "weathercode": 3,
            "time": "2025-06-08T14:00"
          }
        },
        "metadata": {
          "endpoint": "getWeather",
          "timestamp": "2025-06-08T14:30:00Z",
          "dataSize": 256
        }
      },
      "timestamp": "2025-06-08T14:30:00Z"
    }
  ],
  "metadata": {
    "user_id": "agent_001",
    "session_id": "weather_session_123",
    "last_updated": "2025-06-08T14:30:00Z",
    "tool_count": 1,
    "last_endpoint": "getWeather"
  }
}
```

### User Data Retrieval (Test Endpoint)

**Request:**

```bash
POST /mcp
Content-Type: application/json

{
  "input": {
    "endpointName": "getUsers",
    "queryParams": {}
  },
  "history": [],
  "tools": [],
  "metadata": {}
}
```

**Response:**
Returns the original MCP context, updated with transformed user data from jsonplaceholder.typicode.com in the tools array.

## Development Roadmap

### Phase 1: Core Implementation (Current)

- ✅ Basic MCP protocol compliance
- ✅ Weather API integration
- ✅ Error handling framework
- ✅ Configuration management

### Phase 2: Enhanced Features

- 🔄 Input validation with Joi
- 🔄 Comprehensive logging with Winston
- 🔄 Authentication middleware
- 🔄 Rate limiting
- 🔄 Unit and integration tests

### Phase 3: Advanced Features

- ⏳ Circuit breaker pattern for external APIs
- ⏳ Caching layer for frequently requested data
- ⏳ WebSocket support for real-time updates
- ⏳ Plugin system for custom endpoints
- ⏳ Monitoring and metrics collection

### Phase 4: Production Ready

- ⏳ Kubernetes deployment manifests
- ⏳ CI/CD pipeline
- ⏳ Performance optimization
- ⏳ Security audit and hardening

## Extensions and Customization### Adding New Endpoints

1. **Update endpoints.js:**

```javascript
export default {
  // ...existing endpoints...

  myNewEndpoint: {
    url: 'https://api.example.com/data',
    description: 'Description of the new endpoint',
    transformer: (data) => {
      // Transform the response data as needed
      return {
        processed: data.someField,
        timestamp: new Date().toISOString(),
      };
    },
    defaultParams: {
      format: 'json',
    },
  },
};
```

2. **Add authentication support:**

```javascript
mySecureEndpoint: {
  url: "https://api.example.com/secure",
  description: "Endpoint requiring authentication",
  requiresAuth: true,
  authType: "bearer", // or "apikey"
  transformer: (data) => data
}
```

### Authentication Support

The server supports multiple authentication methods:

- **API Key**: Pass API keys in request headers
- **Bearer Token**: OAuth2 bearer tokens
- **Custom Headers**: Any custom authentication headers

**Example with authentication:**

```json
{
  "input": {
    "endpointName": "mySecureEndpoint",
    "queryParams": { "filter": "recent" },
    "authHeaders": {
      "Authorization": "Bearer your-token-here",
      "X-API-Key": "your-api-key"
    }
  }
}
```

### Input Validation

Use Joi schema validation for robust input checking:

```javascript
import Joi from 'joi';

const mcpRequestSchema = Joi.object({
  input: Joi.object({
    endpointName: Joi.string().required(),
    queryParams: Joi.object().optional(),
    authHeaders: Joi.object().optional(),
  }).required(),
  history: Joi.array().optional(),
  tools: Joi.array().optional(),
  metadata: Joi.object().optional(),
});
```

### Custom Data Transformers

Transform API responses to match your application's needs:

```javascript
const weatherTransformer = (data) => ({
  location: `${data.name}, ${data.country}`,
  temperature: `${data.main.temp}°C`,
  condition: data.weather[0].description,
  humidity: `${data.main.humidity}%`,
  feelsLike: `${data.main.feels_like}°C`,
});
```

### Integration Patterns

#### With Node.js Applications

```javascript
import axios from 'axios';

async function callMCPServer(endpointName, params) {
  try {
    const response = await axios.post('http://localhost:8000/mcp', {
      input: {
        endpointName: endpointName,
        queryParams: params,
      },
      history: [],
      tools: [],
      metadata: {},
    });
    return response.data;
  } catch (error) {
    console.error('Error calling MCP server:', error.message);
    throw error;
  }
}

// Example usage for weather data
async function getWeatherData(latitude, longitude) {
  return await callMCPServer('getWeather', {
    latitude,
    longitude,
    current_weather: true,
    daily: 'temperature_2m_max,temperature_2m_min',
  });
}

// Example usage for user data
async function getUserData() {
  return await callMCPServer('getUsers', {});
}
```

#### With Express.js Integration

```javascript
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Middleware to call MCP server
const mcpClient = {
  async call(endpointName, params) {
    const response = await axios.post('http://localhost:8000/mcp', {
      input: { endpointName, queryParams: params },
      history: [],
      tools: [],
      metadata: { client: 'express-app' },
    });
    return response.data;
  },
};

// Route that uses MCP server for weather data
app.get('/api/weather/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const weatherData = await mcpClient.call('getWeather', {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      current_weather: true,
    });

    // Extract the actual weather data from MCP response
    const result = weatherData.tools[weatherData.tools.length - 1].output.data;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Client app running on port 3000');
});
```

## Deployment Guide

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd mcp-weather-server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

### Production Deployment

#### Environment Variables

```env
PORT=8000
NODE_ENV=production
LOG_LEVEL=info
API_TIMEOUT=10000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Security Considerations

### Input Sanitization

- Validate all incoming MCP requests
- Sanitize query parameters
- Limit request payload size
- Implement request timeout

### API Key Management

- Store API keys in environment variables
- Rotate keys regularly
- Use different keys for different environments
- Monitor API key usage

### Rate Limiting

- Implement per-IP rate limiting
- Add endpoint-specific limits
- Monitor for abuse patterns
- Implement circuit breakers for external APIs

## Monitoring and Observability

### Logging Strategy

- Structured logging with Winston
- Log levels: error, warn, info, debug
- Include request IDs for tracing
- Log external API response times

### Metrics Collection

- Request count and response times
- External API success/failure rates
- Memory and CPU usage
- Error rates by endpoint

### Health Checks

- `/health` endpoint for basic health
- Database connectivity checks
- External API availability checks
- Memory and disk usage monitoring

## Summary

The MCP Weather Server provides a robust, extensible foundation for integrating external data sources with MCP-compatible AI agents and applications. Key features include:

**Core Capabilities:**

- ✅ Full MCP protocol compliance
- ✅ Weather data integration (Open-Meteo API)
- ✅ Configurable endpoint management
- ✅ Comprehensive error handling
- ✅ Data transformation pipeline

**Production Features:**

- 🔄 Authentication and security middleware
- 🔄 Input validation and sanitization
- 🔄 Structured logging and monitoring
- 🔄 Rate limiting and circuit breakers
- 🔄 Comprehensive test coverage

**Integration Ready:**

- Compatible with Node.js applications and JavaScript frameworks
- RESTful API design for easy integration
- Extensible architecture for custom endpoints
- Production-ready deployment configurations

This server enables seamless data flow between AI agents and external APIs while maintaining MCP protocol standards for consistency and interoperability.

## Next Steps

1. **Review and approve this PRD**
2. **Set up development environment**
3. **Implement core functionality (Phase 1)**
4. **Add enhanced features (Phase 2)**
5. **Prepare for production deployment (Phase 3-4)**

For questions, clarifications, or additional requirements, please provide feedback on this document before proceeding with implementation.
