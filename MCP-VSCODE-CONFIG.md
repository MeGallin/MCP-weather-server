# VS Code MCP Configuration Guide

## Option 1: Local Stdio Server (Recommended)

Update your VS Code `settings.json` to use the local stdio server:

```json
{
  "mcp": {
    "servers": {
      "weather-server": {
        "command": "node",
        "args": ["mcp-weather-stdio.js"],
        "cwd": "C:\\xampp\\htdocs\\WebSitesDesigns\\developments\\cline-test\\MCP-weather-server",
        "transportType": "stdio",
        "autoApprove": [],
        "disabled": false,
        "timeout": 60,
        "env": {
          "NODE_ENV": "development"
        }
      }
    }
  }
}
```

**Benefits:**
- ✅ No authentication required
- ✅ Direct local access to weather APIs
- ✅ Faster response times
- ✅ No network dependencies

## Option 2: HTTP Server (Public Endpoint)

If you prefer to use the remote Render deployment, update your configuration:

```json
{
  "mcp": {
    "servers": {
      "weather-server": {
        "autoApprove": [],
        "disabled": false,
        "timeout": 60,
        "type": "http",
        "url": "https://mcp-weather-server-o6o8.onrender.com/mcp-public",
        "transportType": "http"
      }
    }
  }
}
```

**Benefits:**
- ✅ No local server required
- ✅ Centralized deployment
- ✅ Public access without API keys

## Option 3: HTTP Server with Authentication (Enterprise)

For production use with API key authentication:

```json
{
  "mcp": {
    "servers": {
      "weather-server": {
        "autoApprove": [],
        "disabled": false,
        "timeout": 60,
        "type": "http",
        "url": "https://mcp-weather-server-o6o8.onrender.com/mcp",
        "transportType": "http",
        "headers": {
          "X-API-Key": "your-api-key-here"
        }
      }
    }
  }
}
```

**Note:** You would need to generate an API key first:
1. POST to `/auth/login` with credentials
2. POST to `/auth/api-key` with JWT token
3. Use the returned API key in the configuration

## Recommendation

**Use Option 1 (Local Stdio)** for VS Code development as it's the most reliable and doesn't require network connectivity or authentication setup.
