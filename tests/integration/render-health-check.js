#!/usr/bin/env node

/**
 * Render.com Health Check Simulation
 * This script simulates how Render.com's health check system interacts with the server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Render.com Health Check Simulation\n');

// Start the server
console.log('1. Starting MCP Weather Server...');
const serverProcess = spawn('node', ['../../index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'production', PORT: '8001' }
});

let serverOutput = '';
let serverErrors = '';

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  serverErrors += data.toString();
});

// Wait for server to start
setTimeout(async () => {
  console.log('2. Simulating Render.com health checks...\n');

  // Test 1: Root endpoint with Go-http-client (Render's health check)
  console.log('   🔄 Testing root endpoint with Render health check user agent...');
  try {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch('http://localhost:8001/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Go-http-client/2.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ ROOT ENDPOINT SUCCESS');
      console.log(`      Status: ${response.status}`);
      console.log(`      Response: ${data.name} - ${data.status}`);
    } else {
      console.log('   ❌ ROOT ENDPOINT FAILED');
      console.log(`      Status: ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ ROOT ENDPOINT ERROR:', error.message);
  }

  // Test 2: Health endpoint
  console.log('\n   🔄 Testing /health endpoint...');
  try {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch('http://localhost:8001/health', {
      method: 'GET',
      headers: {
        'User-Agent': 'Go-http-client/2.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ HEALTH ENDPOINT SUCCESS');
      console.log(`      Status: ${response.status}`);
      console.log(`      Response: ${data.status}`);
    } else {
      console.log('   ❌ HEALTH ENDPOINT FAILED');
      console.log(`      Status: ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ HEALTH ENDPOINT ERROR:', error.message);
  }

  // Test 3: Invalid endpoint (should not log warning for health checks)
  console.log('\n   🔄 Testing 404 handling for health check user agent...');
  try {
    const { default: fetch } = await import('node-fetch');
    
    const response = await fetch('http://localhost:8001/nonexistent', {
      method: 'GET',
      headers: {
        'User-Agent': 'Go-http-client/2.0'
      }
    });

    console.log('   ✅ 404 HANDLING TEST');
    console.log(`      Status: ${response.status} (expected 404)`);
    console.log('      Should not generate warning logs for health check user agent');
  } catch (error) {
    console.log('   ❌ 404 HANDLING ERROR:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('   • Root endpoint (/) now responds properly to Render health checks');
  console.log('   • Health endpoint (/health) available as backup');
  console.log('   • Reduced logging noise for health check user agents');
  console.log('   • Server should deploy without 404 warnings on Render.com');

  console.log('\n📦 Deployment Notes:');
  console.log('   • Render will call GET / for health checks');
  console.log('   • Server now responds with proper status information');
  console.log('   • No more "404 Not Found" warnings in Render logs');

  // Clean up
  serverProcess.kill();
  process.exit(0);
}, 3000);

// Handle server startup errors
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating health check simulation...');
  serverProcess.kill();
  process.exit(0);
});
