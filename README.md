# MCP Weather Server

A production-ready Node.js/Express application implementing the Model Context Protocol (MCP) standard with advanced features including authentication, rate limiting, comprehensive logging, and extensive validation.

## Overview

The MCP Weather Server acts as a secure, high-performance bridge between MCP-compatible clients and various data sources. It accepts MCP context requests, fetches data from configured endpoints with proper authentication and validation, and returns updated MCP contexts.

## 🚀 Features

### Phase 1 (Core Implementation)

- ✅ **MCP Protocol Compliance**: Fully implements MCP standard for tool results
- 🌤️ **Weather Data Integration**: Built-in support for Open-Meteo weather API
- 🔧 **Extensible Architecture**: Easy to add new API endpoints
- 🛡️ **Security Headers**: Helmet.js integration for security
- 📊 **Basic Logging**: Winston-based logging system
- ⚡ **Performance Optimized**: Handles concurrent requests efficiently

### Phase 2 (Enhanced Features)

- 🔐 **Authentication System**: JWT tokens and API key authentication
- 🚦 **Advanced Rate Limiting**: Multi-tier rate limiting with different rules
- 📋 **Comprehensive Validation**: Joi-based input validation with sanitization
- 📈 **Structured Logging**: Multiple log files with contextual information
- 🧪 **Complete Test Suite**: 94 tests with 100% pass rate using Jest
- 🔧 **Environment Configuration**: Flexible configuration management
- 🛡️ **Enhanced Security**: XSS and SQL injection protection
- 📊 **Performance Monitoring**: Request timing and performance metrics

## 🛠️ Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd MCP-weather-server
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment:

```bash
cp .env.example .env
# Edit .env file with your configuration
```

4. Start the server:

```bash
npm start
```

The server will start on port 8000 by default.

### Development Mode

To run in development mode with auto-reload:

```bash
npm run dev
```

## 🔐 Authentication

The MCP Weather Server supports two authentication methods:

### 1. JWT Token Authentication

First, obtain a JWT token by logging in:

```bash
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  "expiresIn": "24h"
}
```

### 2. API Key Authentication

Generate an API key using your JWT token:

```bash
POST /auth/api-key
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "my-weather-app",
  "permissions": ["read"],
  "expiresIn": "30d"
}
```

Response:

```json
{
  "success": true,
  "message": "API key generated successfully",
  "apiKey": {
    "key": "mcp-admin-1-1675234567-abc123",
    "name": "my-weather-app",
    "permissions": ["read"],
    "createdAt": "2025-06-08T14:30:00Z"
  },
  "warning": "Store this API key securely. It will not be shown again."
}
```

## API Usage

### Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-06-08T14:30:00Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### MCP Request (Authenticated)

All MCP requests require authentication via API key:

```bash
POST /mcp
X-API-Key: mcp-admin-1-1675234567-abc123
Content-Type: application/json
```

#### Weather Data Example

```json
{
  "input": {
    "endpointName": "getWeather",
    "queryParams": {
      "latitude": 52.52,
      "longitude": 13.41,
      "current_weather": true,
      "daily": "temperature_2m_max,temperature_2m_min",
      "forecast_days": 7
    }
  },
  "metadata": {
    "requestId": "weather-001",
    "timestamp": "2025-06-08T14:30:00Z"
  }
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "latitude": 52.52,
    "longitude": 13.405,
    "current_weather": {
      "temperature": 15.3,
      "windspeed": 3.4,
      "winddirection": 123,
      "weathercode": 1,
      "is_day": 1,
      "time": "2025-06-08T14:00"
    },
    "daily": {
      "time": ["2025-06-08", "2025-06-09"],
      "temperature_2m_max": [18.2, 19.1],
      "temperature_2m_min": [8.5, 9.3]
    }
  },
  "context": {
    "tools": [
      {
        "name": "weather_lookup",
        "input": {...},
        "output": {...},
        "timestamp": "2025-06-08T14:30:01Z",
        "duration": 245
      }
    ]
  }
}
```

## 🚦 Rate Limiting

The server implements multiple rate limiting tiers:

- **General Endpoints**: 100 requests per 15 minutes
- **MCP Endpoint**: 30 requests per minute
- **Authentication**: 5 requests per 15 minutes

Rate limit headers are included in responses:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in window
- `RateLimit-Reset`: Time when rate limit resets

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Validation, utilities, and controller logic
- **Integration Tests**: Real API calls and end-to-end workflows
- **Performance Tests**: Load testing and response time validation

## 📋 Configuration

### Environment Variables

The server uses the following environment variables:

```bash
# Server Configuration
PORT=8000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_MAX_REQUESTS=30

# Logging
LOG_LEVEL=info

# Security
CORS_ORIGIN=*
HELMET_ENABLED=true

# Performance
REQUEST_SIZE_LIMIT=10mb
REQUEST_TIMEOUT=30000
```

### Supported Endpoints

The server currently supports these MCP endpoints:

- `getWeather`: Current weather and forecasts from Open-Meteo
- `getCurrentWeather`: Current weather conditions only
- `getUsers`: User data from JSONPlaceholder API
- `getPosts`: Blog posts from JSONPlaceholder API

## 📈 Logging

The server generates multiple log files:

- `logs/combined.log`: All log messages
- `logs/error.log`: Error messages only
- `logs/security.log`: Authentication and security events
- `logs/performance.log`: Performance metrics and timings

### Log Levels

- **error**: Error conditions
- **warn**: Warning conditions
- **info**: Informational messages
- **debug**: Debug-level messages

## 🛡️ Security Features

- **Input Validation**: Comprehensive Joi-based validation
- **XSS Protection**: HTML and script tag filtering
- **SQL Injection Protection**: Parameter sanitization
- **Rate Limiting**: Multiple tiers to prevent abuse
- **Security Headers**: Helmet.js integration
- **Authentication**: JWT and API key support
- **CORS**: Configurable cross-origin resource sharing

## 🔌 VS Code MCP Integration

### MCP Stdio Server

The weather server includes a Model Context Protocol (MCP) stdio transport wrapper for direct integration with VS Code and other MCP-compatible clients.

#### Quick Setup

1. **Start the MCP stdio server:**

   ```bash
   npm run mcp
   ```

2. **Configure VS Code:**
   Add the following to your VS Code `settings.json`:
   ```json
   {
     "mcpServers": {
       "weather-server": {
         "command": "node",
         "args": ["mcp-weather-stdio.js"],
         "cwd": "/path/to/your/MCP-weather-server",
         "env": {
           "NODE_ENV": "development"
         }
       }
     }
   }
   ```

#### Available MCP Tools

The MCP server exposes three weather tools:

- **`get-current-weather`**: Get current weather conditions for a location
- **`get-weather-forecast`**: Get weather forecast (1-5 days) for a location
- **`get-weather-alerts`**: Get weather alerts and warnings for a location

#### Example Tool Usage

```json
{
  "name": "get-current-weather",
  "arguments": {
    "location": "New York, NY",
    "units": "metric"
  }
}
```

Response:

```json
{
  "location": "New York, NY",
  "current": {
    "temperature": 22,
    "humidity": 65,
    "windSpeed": 10,
    "condition": "Partly Cloudy"
  },
  "units": "metric",
  "timestamp": "2025-06-08T..."
}
```

#### Verification

Test the MCP server setup:

```bash
node verify-mcp.js
```

This will verify that:

- ✅ MCP server module loads correctly
- ✅ All weather tools are available
- ✅ Server is ready for VS Code integration

#### Configuration Files

- `vscode-settings-example.json` - Example VS Code configuration
- `mcp-weather-stdio.js` - MCP stdio transport server
- `verify-mcp.js` - Setup verification script

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test framework is implemented)
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- Check the logs in the `logs/` directory
- Review the error messages in API responses
- Ensure all required parameters are provided
- Verify endpoint configurations

## Current Status

✅ **Phase 2 Complete**: All major features implemented and tested
✅ **Test Suite**: 94 tests passing (100% success rate)
✅ **Production Ready**: Comprehensive validation, security, and logging

## Roadmap - Phase 3 Development

- ✅ Unit and integration tests (COMPLETE - 94 tests)
- ✅ Rate limiting middleware (COMPLETE)
- [ ] Circuit breaker implementation
- [ ] Metrics and monitoring
- [ ] Additional API integrations
- [ ] WebSocket support for real-time updates
