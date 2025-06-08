#!/bin/bash

# MCP Weather Server Test Script
# Tests all available endpoints

echo "=== MCP Weather Server Test Suite ==="
echo "Server should be running on http://localhost:8000"
echo ""

# Test 1: Current Weather
echo "1. Testing getCurrentWeather endpoint..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "conversation_id": "test-123",
      "user_id": "user-456"
    },
    "input": {
      "endpointName": "getCurrentWeather",
      "queryParams": {
        "latitude": "40.7128",
        "longitude": "-74.0060"
      }
    }
  }' | jq '.tools[0].output.data.location, .tools[0].output.data.current'

echo ""

# Test 2: Weather Forecast
echo "2. Testing getWeather endpoint (with forecast)..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "conversation_id": "test-456", 
      "user_id": "user-789"
    },
    "input": {
      "endpointName": "getWeather",
      "queryParams": {
        "latitude": "51.5074",
        "longitude": "-0.1278"
      }
    }
  }' | jq '.tools[0].output.data.location, .tools[0].output.data.current, .tools[0].output.data.forecast.dates[0:3]'

echo ""

# Test 3: Users endpoint
echo "3. Testing getUsers endpoint..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "endpointName": "getUsers"
    }
  }' | jq '.tools[0].output.data[0:2]'

echo ""

# Test 4: Posts endpoint  
echo "4. Testing getPosts endpoint..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "endpointName": "getPosts"
    }
  }' | jq '.tools[0].output.data[0:1]'

echo ""

# Test 5: Error handling - invalid endpoint
echo "5. Testing error handling (invalid endpoint)..."
curl -s -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "endpointName": "invalidEndpoint"
    }
  }' | jq '.error, .availableEndpoints'

echo ""
echo "=== Test Suite Complete ==="
