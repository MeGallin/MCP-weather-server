#!/usr/bin/env node

/**
 * Debug script to test the tools/call endpoint specifically
 */

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;

async function debugToolsCall() {
  console.log('🔍 Debugging tools/call endpoint...\n');

  try {
    // Test tools/call request with detailed logging
    console.log('Testing tools/call request...');
    const callRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: {
          location: 'London',
        },
      },
    };

    console.log('Request payload:', JSON.stringify(callRequest, null, 2));

    const callResponse = await axios.post(MCP_ENDPOINT, callRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VS Code MCP Client',
      },
      timeout: 15000,
    });

    console.log('Response status:', callResponse.status);
    console.log('Response headers:', callResponse.headers);
    console.log('Response data:', JSON.stringify(callResponse.data, null, 2));

    if (callResponse.status === 200 && callResponse.data.result) {
      console.log('✅ Tools call request successful');
    } else {
      console.log('❌ Tools call request failed - no result in response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
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

debugToolsCall();
