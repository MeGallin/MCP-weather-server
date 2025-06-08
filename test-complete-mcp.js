#!/usr/bin/env node

/**
 * Comprehensive test script for the MCP weather server
 * Tests all three main MCP JSON-RPC methods with multiple scenarios
 */

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;

async function testMCPServer() {
  console.log('🧪 Testing Complete MCP Weather Server...\n');

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
          roots: { listChanged: false },
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
      console.log(`   Version: ${initResponse.data.result.serverInfo.version}`);
    } else {
      throw new Error('Initialize request failed');
    }

    // Test 2: Tools list request
    console.log('\n2. Testing tools/list request...');
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
      console.log(
        `   Available tools: ${toolsResponse.data.result.tools.length}`,
      );
      console.log(
        `   Tool names: ${toolsResponse.data.result.tools
          .map((t) => t.name)
          .join(', ')}`,
      );
    } else {
      throw new Error('Tools list request failed');
    }

    // Test 3: Tools call requests with different locations
    const testLocations = [
      { location: 'London', expected: true },
      { location: 'New York', expected: true },
      { location: 'Paris', expected: true },
      { location: 'London,UK', expected: true }, // Should work with improved geocoding
      { location: 'InvalidCity123', expected: false },
    ];

    for (let i = 0; i < testLocations.length; i++) {
      const testCase = testLocations[i];
      console.log(
        `\n3.${i + 1} Testing tools/call with "${testCase.location}"...`,
      );

      const callRequest = {
        jsonrpc: '2.0',
        id: 3 + i,
        method: 'tools/call',
        params: {
          name: 'get_weather',
          arguments: {
            location: testCase.location,
          },
        },
      };

      try {
        const callResponse = await axios.post(MCP_ENDPOINT, callRequest, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VS Code MCP Client',
          },
          timeout: 15000,
        });

        if (callResponse.status === 200) {
          if (callResponse.data.result && testCase.expected) {
            console.log(
              `✅ Weather request successful for "${testCase.location}"`,
            );
            const content = callResponse.data.result.content[0].text;
            const lines = content.split('\n').slice(0, 3);
            console.log(`   Preview: ${lines.join(' | ')}`);
          } else if (callResponse.data.error && !testCase.expected) {
            console.log(
              `✅ Expected error for invalid location "${testCase.location}"`,
            );
            console.log(`   Error: ${callResponse.data.error.message}`);
          } else if (callResponse.data.error && testCase.expected) {
            console.log(
              `⚠️  Unexpected error for "${testCase.location}": ${callResponse.data.error.message}`,
            );
            if (callResponse.data.error.data?.suggestions) {
              console.log(
                `   Suggestions: ${callResponse.data.error.data.suggestions.join(
                  ', ',
                )}`,
              );
            }
          } else {
            console.log(`❌ Unexpected response for "${testCase.location}"`);
          }
        } else {
          console.log(
            `❌ HTTP error ${callResponse.status} for "${testCase.location}"`,
          );
        }
      } catch (error) {
        if (testCase.expected) {
          console.log(
            `❌ Request failed for "${testCase.location}": ${error.message}`,
          );
        } else {
          console.log(`✅ Expected failure for "${testCase.location}"`);
        }
      }
    }

    // Test 4: Health check
    console.log('\n4. Testing health check endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/mcp/health`, {
      timeout: 5000,
    });

    if (
      healthResponse.status === 200 &&
      healthResponse.data.status === 'ready'
    ) {
      console.log('✅ Health check successful');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Transport: ${healthResponse.data.transport}`);
    } else {
      console.log('❌ Health check failed');
    }

    console.log('\n🎉 MCP Server Testing Complete!');
    console.log('✅ The server is ready for VS Code MCP client connections.');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2),
      );
    }
    process.exit(1);
  }
}

// Run the comprehensive tests
testMCPServer();
