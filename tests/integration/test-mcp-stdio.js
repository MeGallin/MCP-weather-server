#!/usr/bin/env node

/**
 * Test script for MCP Weather Server stdio transport
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing MCP Weather Server...\n');

// Test 1: List available tools
console.log('1. Testing tools/list request:');
const mcpProcess = spawn('node', ['../../mcp-weather-stdio.js'], {
  cwd: join(__dirname, '../..'),
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
};

mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

let responseData = '';
mcpProcess.stdout.on('data', (data) => {
  responseData += data.toString();
});

mcpProcess.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

setTimeout(() => {
  console.log('Response:', responseData);

  // Test 2: Call weather tool
  console.log('\n2. Testing get-current-weather tool:');

  const weatherRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get-current-weather',
      arguments: {
        location: 'New York, NY',
        units: 'metric',
      },
    },
  };

  mcpProcess.stdin.write(JSON.stringify(weatherRequest) + '\n');

  setTimeout(() => {
    mcpProcess.kill();
    console.log('\nMCP Server test completed!');
  }, 2000);
}, 2000);
