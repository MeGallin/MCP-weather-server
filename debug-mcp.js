#!/usr/bin/env node

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;

async function debugMCPCall() {
  console.log('🔍 Debugging MCP tools/call request...\n');

  try {
    const callRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: {
          location: 'London,UK',
        },
      },
    };

    console.log('📤 Sending request:', JSON.stringify(callRequest, null, 2));

    const callResponse = await axios.post(MCP_ENDPOINT, callRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VS Code MCP Client',
      },
      timeout: 15000,
    });

    console.log('📥 Response status:', callResponse.status);
    console.log(
      '📥 Response data:',
      JSON.stringify(callResponse.data, null, 2),
    );

    if (callResponse.data.error) {
      console.error('❌ Server returned error:', callResponse.data.error);
    } else if (callResponse.data.result) {
      console.log('✅ Success! Weather data retrieved');
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
    if (error.code === 'ECONNABORTED') {
      console.error('⚠️  Request timed out');
    }
  }
}

debugMCPCall();
