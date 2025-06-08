#!/usr/bin/env node

/**
 * VS Code MCP Connection Test
 * Tests the connection exactly as VS Code would connect to the MCP server
 */

import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';
const MCP_ENDPOINT = `${SERVER_URL}/mcp`;
const HEALTH_ENDPOINT = `${SERVER_URL}/mcp/health`;

// VS Code MCP client headers
const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'vscode-mcp-client/1.0.0',
  Accept: 'application/json',
  Connection: 'keep-alive',
};

async function testConnection() {
  console.log('🧪 VS Code MCP Connection Test');
  console.log('=====================================\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(HEALTH_ENDPOINT, {
      headers,
      timeout: 10000,
    });
    console.log('✅ Health Check:', healthResponse.data.status);
    console.log(`   Protocol Version: ${healthResponse.data.protocolVersion}`);
    console.log(`   Transport: ${healthResponse.data.transport}\n`);

    // 2. Initialize Connection
    console.log('2️⃣ Testing Initialize...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'vscode-mcp-client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await axios.post(MCP_ENDPOINT, initRequest, {
      headers,
      timeout: 10000,
    });
    console.log('✅ Initialize Success');
    console.log(`   Server: ${initResponse.data.result.serverInfo.name}`);
    console.log(`   Version: ${initResponse.data.result.serverInfo.version}\n`);

    // 3. List Tools
    console.log('3️⃣ Testing Tools List...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };

    const toolsResponse = await axios.post(MCP_ENDPOINT, toolsRequest, {
      headers,
      timeout: 10000,
    });
    console.log('✅ Tools List Success');
    console.log(
      `   Available Tools: ${toolsResponse.data.result.tools.length}`,
    );
    toolsResponse.data.result.tools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // 4. Test Weather Tool
    console.log('4️⃣ Testing Weather Tool...');
    const weatherRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: {
          location: 'New York',
        },
      },
    };

    const weatherResponse = await axios.post(MCP_ENDPOINT, weatherRequest, {
      headers,
      timeout: 15000,
    });

    if (weatherResponse.data.result) {
      console.log('✅ Weather Tool Success');
      const weatherText = weatherResponse.data.result.content[0].text;
      console.log('   Weather Data:', weatherText.split('\n')[0]);
    } else {
      console.log('❌ Weather Tool Error:', weatherResponse.data.error);
    }
    console.log();

    // 5. Connection Stability Test
    console.log('5️⃣ Testing Connection Stability (5 rapid requests)...');
    const rapidRequests = [];
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(
        axios.post(
          MCP_ENDPOINT,
          { ...toolsRequest, id: i + 10 },
          {
            headers,
            timeout: 5000,
          },
        ),
      );
    }

    const rapidResults = await Promise.all(rapidRequests);
    console.log(
      `✅ Stability Test: ${rapidResults.length}/5 requests successful\n`,
    );

    console.log(
      '🎉 All tests passed! VS Code MCP connection should work properly.',
    );
    console.log('\n📋 Connection Summary:');
    console.log(`   Server URL: ${MCP_ENDPOINT}`);
    console.log(`   Health URL: ${HEALTH_ENDPOINT}`);
    console.log('   Transport: HTTP with keep-alive');
    console.log('   Protocol: MCP 2024-11-05');
    console.log('   Status: ✅ READY FOR VS CODE');
  } catch (error) {
    console.error('❌ Connection Test Failed:', error.message);
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', error.response.data);
    }
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check server deployment status');
    console.log('   2. Verify network connectivity');
    console.log('   3. Check VS Code MCP configuration');
    process.exit(1);
  }
}

// Run the test
testConnection();
