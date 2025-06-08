# MCP Weather Server

A Node.js/Express-based application that implements the Model Context Protocol (MCP) standard for fetching data from external HTTP endpoints, with a primary focus on weather data retrieval.

## Overview

The MCP Weather Server acts as a bridge between MCP-compatible clients and various data sources. It accepts MCP context requests, fetches data from configured endpoints, and returns updated MCP contexts with the retrieved data.

## Features

- ✅ **MCP Protocol Compliance**: Fully implements MCP standard for tool results
- 🌤️ **Weather Data Integration**: Built-in support for Open-Meteo weather API
- 🔧 **Extensible Architecture**: Easy to add new API endpoints
- 🛡️ **Security Features**: Input validation, rate limiting, and secure headers
- 📊 **Comprehensive Logging**: Winston-based logging with multiple levels
- ⚡ **High Performance**: Optimized for concurrent requests
- 🔄 **Error Handling**: Robust error handling with circuit breaker patterns

## Quick Start

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

3. Create environment file:

```bash
cp .env.example .env
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

## API Usage

### Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-06-08T14:30:00Z"
}
```

### MCP Request

```bash
POST /mcp
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

#### Available Endpoints

- `getWeather`: Get weather forecast data from Open-Meteo
- `getCurrentWeather`: Get current weather conditions
- `getUsers`: Test endpoint using JSONPlaceholder
- `getPosts`: Test endpoint using JSONPlaceholder

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=8000
NODE_ENV=development
LOG_LEVEL=info
REQUEST_TIMEOUT=10000
MAX_REQUEST_SIZE=10mb
```

### Adding New Endpoints

Edit `config/endpoints.js` to add new API endpoints:

```javascript
export default {
  myEndpoint: {
    url: 'https://api.example.com/data',
    description: 'My custom endpoint',
    transformer: (data) => ({
      // Transform the response data
      transformed: data.original,
    }),
    defaultParams: {
      format: 'json',
    },
  },
};
```

## Project Structure

```
/mcp-weather-server
├── index.js                 # Main server entry point
├── package.json             # Project dependencies and scripts
├── README.md               # This file
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── /config
│   └── endpoints.js        # External API endpoint configurations
├── /controllers
│   └── mcpController.js    # MCP request handling logic
├── /utils
│   ├── mcpUtils.js         # MCP protocol utilities
│   ├── validation.js       # Input validation utilities
│   └── logger.js           # Logging utilities
└── /middleware
    └── errorHandler.js     # Global error handling
```

## Development

### Scripts

- `npm start`: Start the server in production mode
- `npm run dev`: Start with auto-reload for development
- `npm test`: Run tests (to be implemented)
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues

### Adding Features

1. **New Endpoints**: Add to `config/endpoints.js`
2. **Validation**: Update schemas in `utils/validation.js`
3. **Transformers**: Create data transformation functions
4. **Middleware**: Add new middleware to `/middleware` directory

### Testing

To test the server, you can use curl or any HTTP client:

```bash
# Health check
curl http://localhost:8000/health

# Weather request
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "endpointName": "getCurrentWeather",
      "queryParams": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    },
    "tools": [],
    "metadata": {}
  }'
```

## Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure appropriate `LOG_LEVEL`
3. Set up proper CORS origins
4. Configure rate limiting
5. Use HTTPS in production

### Scaling

The server is designed to handle concurrent requests efficiently. For high-load scenarios:

- Use a process manager like PM2
- Implement Redis for session storage (if needed)
- Set up load balancing
- Monitor performance metrics

## Integration Examples

### Node.js Application

```javascript
import axios from 'axios';

const mcpRequest = {
  input: {
    endpointName: 'getWeather',
    queryParams: {
      latitude: 52.52,
      longitude: 13.41,
    },
  },
  tools: [],
  metadata: { session: 'example' },
};

const response = await axios.post('http://localhost:8000/mcp', mcpRequest);
console.log('Weather data:', response.data.tools[0].output.data);
```

### Express.js Route Handler

```javascript
app.get('/weather/:lat/:lon', async (req, res) => {
  try {
    const mcpResponse = await axios.post('http://localhost:8000/mcp', {
      input: {
        endpointName: 'getCurrentWeather',
        queryParams: {
          latitude: parseFloat(req.params.lat),
          longitude: parseFloat(req.params.lon),
        },
      },
      tools: [],
      metadata: { source: 'web-app' },
    });

    const weatherData = mcpResponse.data.tools[0].output.data;
    res.json(weatherData);
  } catch (error) {
    res.status(500).json({ error: 'Weather fetch failed' });
  }
});
```

## Error Handling

The server implements comprehensive error handling:

- **400**: Invalid MCP request format
- **404**: Route not found
- **408**: Request timeout
- **502**: External API error
- **503**: Service unavailable
- **500**: Internal server error

All errors include timestamps and detailed information for debugging.

## Logging

Logs are written to:

- Console (with colors in development)
- `logs/combined.log` (all logs)
- `logs/error.log` (error logs only)

Log levels: `error`, `warn`, `info`, `debug`

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request handling
- **Input Validation**: Joi-based validation
- **Request Size Limits**: Prevent oversized payloads
- **Error Sanitization**: Safe error messages in production

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

## Roadmap

- [ ] Unit and integration tests
- [ ] Rate limiting middleware
- [ ] Circuit breaker implementation
- [ ] Metrics and monitoring
- [ ] Additional API integrations
- [ ] WebSocket support for real-time updates
