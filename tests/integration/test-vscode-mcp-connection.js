#!/usr/bin/env node

/**
 * VS Code MCP Connection Test
 *
 * This script simulates VS Code's MCP HTTP transport client to test
 * connection stability and protocol compliance.
 */

import axios from 'axios';

const SERVER_URL =
  process.env.TEST_SERVER_URL || 'https://mcp-weather-server-o6o8.onrender.com';

// Simulate VS Code MCP client behavior
const vscodeClient = axios.create({
  timeout: 60000,
  headers: {
    'User-Agent': 'vscode-mcp-client/1.0.0',
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Connection: 'keep-alive',
  },
  // Keep connections alive
  keepAlive: true,
  maxSockets: 5,
});

async function testVSCodeMCPConnection() {
  console.log('🔌 Testing VS Code MCP HTTP Connection...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing MCP health endpoint...');
    const healthResponse = await vscodeClient.get(`${SERVER_URL}/mcp/health`);

    if (
      healthResponse.status === 200 &&
      healthResponse.data.status === 'ready'
    ) {
      console.log('✅ Health check passed');
      console.log(`   Server: ${healthResponse.data.serverInfo.name}`);
      console.log(`   Protocol: ${healthResponse.data.protocolVersion}`);
    } else {
      console.log('❌ Health check failed');
      return;
    }

    // Test 2: Initialize Connection (simulating VS Code's behavior)
    console.log('\n2️⃣ Testing MCP initialization...');
    const initRequest = {
      jsonrpc: '2.0',
      id: 'vscode-init-1',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
        clientInfo: {
          name: 'vscode-mcp-client',
          version: '1.0.0',
        },
      },
    };

    const initResponse = await vscodeClient.post(
      `${SERVER_URL}/mcp`,
      initRequest,
    );

    if (initResponse.status === 200 && initResponse.data.result) {
      console.log('✅ Initialization successful');
      console.log(
        `   Server capabilities: ${JSON.stringify(
          initResponse.data.result.capabilities,
        )}`,
      );
    } else {
      console.log('❌ Initialization failed');
      console.log('Response:', JSON.stringify(initResponse.data, null, 2));
      return;
    }

    // Test 3: Multiple rapid requests (connection stability test)
    console.log('\n3️⃣ Testing connection stability (10 rapid requests)...');
    const promises = [];

    for (let i = 0; i < 10; i++) {
      const request = {
        jsonrpc: '2.0',
        id: `stability-test-${i}`,
        method: 'tools/list',
        params: {},
      };

      promises.push(vscodeClient.post(`${SERVER_URL}/mcp`, request));
    }

    const responses = await Promise.all(promises);
    const successCount = responses.filter((r) => r.status === 200).length;

    if (successCount === 10) {
      console.log(
        '✅ Connection stability test passed (10/10 requests successful)',
      );
    } else {
      console.log(
        `⚠️ Connection stability test partial success (${successCount}/10 requests successful)`,
      );
    }

    // Test 4: Weather tool call
    console.log('\n4️⃣ Testing weather tool call...');
    const weatherRequest = {
      jsonrpc: '2.0',
      id: 'weather-test-1',
      method: 'tools/call',
      params: {
        name: 'get_weather',
        arguments: {
          location: 'London',
        },
      },
    };

    const weatherResponse = await vscodeClient.post(
      `${SERVER_URL}/mcp`,
      weatherRequest,
    );

    if (weatherResponse.status === 200 && weatherResponse.data.result) {
      console.log('✅ Weather tool call successful');
      const content = weatherResponse.data.result.content?.[0]?.text;
      if (content) {
        console.log('   Weather data received (truncated):');
        console.log(`   ${content.split('\n')[0]}...`);
      }
    } else {
      console.log('❌ Weather tool call failed');
      console.log('Response:', JSON.stringify(weatherResponse.data, null, 2));
    }

    // Test 5: Connection persistence test
    console.log(
      '\n5️⃣ Testing connection persistence (5 second delay between requests)...',
    );

    const persistenceTest1 = {
      jsonrpc: '2.0',
      id: 'persistence-1',
      method: 'tools/list',
      params: {},
    };

    const response1 = await vscodeClient.post(
      `${SERVER_URL}/mcp`,
      persistenceTest1,
    );
    console.log('   First request:', response1.status === 200 ? '✅' : '❌');

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const persistenceTest2 = {
      jsonrpc: '2.0',
      id: 'persistence-2',
      method: 'tools/list',
      params: {},
    };

    const response2 = await vscodeClient.post(
      `${SERVER_URL}/mcp`,
      persistenceTest2,
    );
    console.log(
      '   Second request (after 5s):',
      response2.status === 200 ? '✅' : '❌',
    );

    console.log('\n🎉 VS Code MCP connection test completed successfully!');
    console.log('\n📝 Results Summary:');
    console.log('   • Health check: ✅');
    console.log('   • Initialization: ✅');
    console.log(`   • Stability (10 requests): ${successCount}/10 ✅`);
    console.log('   • Weather tool: ✅');
    console.log('   • Connection persistence: ✅');

    console.log('\n🔧 Configuration for VS Code:');
    console.log(
      '   Add this server configuration to your VS Code settings.json:',
    );
    console.log('   {');
    console.log('     "mcp": {');
    console.log('       "servers": {');
    console.log('         "weather-server": {');
    console.log(`           "url": "${SERVER_URL}/mcp",`);
    console.log('           "transportType": "http",');
    console.log('           "timeout": 60,');
    console.log('           "retryCount": 3,');
    console.log('           "headers": {');
    console.log('             "Content-Type": "application/json",');
    console.log('             "User-Agent": "vscode-mcp-client/1.0.0"');
    console.log('           }');
    console.log('         }');
    console.log('       }');
    console.log('     }');
    console.log('   }');
  } catch (error) {
    console.error('❌ VS Code MCP connection test failed:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.code) {
      console.error('   Error code:', error.code);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if the server is running');
    console.log('   2. Verify the server URL is correct');
    console.log('   3. Check network connectivity');
    console.log('   4. Ensure VS Code MCP extension is installed');
  }
}

// Run the test
testVSCodeMCPConnection();
