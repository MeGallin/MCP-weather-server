#!/usr/bin/env node

/**
 * Test script to verify the MCP endpoint fix
 * Tests the three main MCP JSON-RPC methods that VS Code uses
 */

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;

async function testMCPEndpoint() {
  console.log('🧪 Testing MCP endpoint fix...\n');

  try {
    // Test 1: Initialize request
    console.log('1. Testing initialize request...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: false,
          },
          sampling: {},
        },
        clientInfo: {
          name: 'VS Code MCP Client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await axios.post(MCP_ENDPOINT, initRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VS Code MCP Client',
      },
      timeout: 10000,
    });

    if (initResponse.status === 200 && initResponse.data.result) {
      console.log('✅ Initialize request successful');
      console.log(`   Server: ${initResponse.data.result.serverInfo.name}`);
      console.log(`   Version: ${initResponse.data.result.serverInfo.version}\n`);
    } else {
      throw new Error('Initialize request failed');
    }

    // Test 2: Tools list request
    console.log('2. Testing tools/list request...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const toolsResponse = await axios.post(MCP_ENDPOINT, toolsRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VS Code MCP Client',
      },
      timeout: 10000,
    });

    if (toolsResponse.status === 200 && toolsResponse.data.result) {
      console.log('✅ Tools list request successful');
      console.log(`   Available tools: ${toolsResponse.data.result.tools.length}`);
      console.log(`   Tool names: ${toolsResponse.data.result.tools.map(t => t.name).join(', ')}\n`);
    } else {
      throw new Error('Tools list request failed');
    }

    // Test 3: Tools call request
    console.log('3. Testing tools/call request...');
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

    const callResponse = await axios.post(MCP_ENDPOINT, callRequest, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VS Code MCP Client',
      },
      timeout: 15000, // Longer timeout for weather API call
    });

    if (callResponse.status === 200 && callResponse.data.result) {
      console.log('✅ Tools call request successful');
      console.log('   Weather data retrieved successfully');
      console.log(`   Response content length: ${callResponse.data.result.content[0].text.length} characters\n`);
    } else {
      throw new Error('Tools call request failed');
    }

    console.log('🎉 ALL TESTS PASSED! MCP endpoint is working correctly.');
    console.log('✅ VS Code should now be able to connect successfully.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNABORTED') {
      console.error('⚠️  Request timed out - server may still be hanging');
    }
    process.exit(1);
  }
}

// Run the tests
testMCPEndpoint();
