#!/usr/bin/env node

/**
 * Get current weather for London using the MCP weather server
 */

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;

async function getWeather(location = 'London') {
  console.log(`🌤️ Getting current weather for ${location}...\n`);

  try {
    const callRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: {
          location: location,
        },
      },
    };

    const response = await axios.post(MCP_ENDPOINT, callRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Weather-Client/1.0.0',
      },
      timeout: 15000,
    });

    if (response.status === 200 && response.data.result) {
      const weatherText = response.data.result.content[0].text;
      console.log(weatherText);
    } else if (response.data.error) {
      console.error('❌ Error:', response.data.error.message);
      if (response.data.error.data?.suggestions) {
        console.log(
          '💡 Suggestions:',
          response.data.error.data.suggestions.join(', '),
        );
      }
    } else {
      console.error('❌ Unexpected response format');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2),
      );
    }
  }
}

// Get location from command line argument or default to London
const location = process.argv[2] || 'London';
getWeather(location);
