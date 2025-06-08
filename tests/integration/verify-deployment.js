// Quick verification that public MCP endpoint is working
// Run this after deploying the authentication removal changes

import https from 'https';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Test-Client/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: responseData,
        });
      });
    });

    req.on('error', reject);

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function verifyDeployment() {
  console.log('🚀 Verifying MCP Weather Server Deployment\n');

  // Test 1: Root endpoint should work
  try {
    console.log('1️⃣ Testing root endpoint...');
    const rootResponse = await testEndpoint('/');
    console.log(`   Status: ${rootResponse.status}`);

    if (rootResponse.status === 200) {
      const data = JSON.parse(rootResponse.data);
      console.log(`   ✅ Server is running: ${data.name} v${data.version}`);
      console.log(
        `   📋 Endpoints: ${JSON.stringify(data.endpoints, null, 6)}`,
      );
    } else {
      console.log(`   ❌ Unexpected status: ${rootResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Health endpoint
  try {
    console.log('\n2️⃣ Testing health endpoint...');
    const healthResponse = await testEndpoint('/health');
    console.log(`   Status: ${healthResponse.status}`);

    if (healthResponse.status === 200) {
      console.log('   ✅ Health check passed');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: MCP endpoint (POST) - should work without auth after deployment
  try {
    console.log('\n3️⃣ Testing MCP POST endpoint (public access)...');
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    const mcpResponse = await testEndpoint('/mcp', 'POST', mcpRequest);
    console.log(`   Status: ${mcpResponse.status}`);

    if (mcpResponse.status === 200) {
      console.log('   ✅ MCP endpoint accessible without authentication!');
      console.log('   🎉 VS Code should be able to connect now');
    } else if (mcpResponse.status === 401) {
      console.log(
        '   ⚠️  Still requires authentication - deployment may not be complete',
      );
    } else {
      console.log(`   ❓ Unexpected status: ${mcpResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: MCP endpoint (GET) - SSE support
  try {
    console.log('\n4️⃣ Testing MCP GET endpoint (SSE support)...');
    const sseResponse = await testEndpoint('/mcp', 'GET');
    console.log(`   Status: ${sseResponse.status}`);

    if (sseResponse.status === 200) {
      console.log('   ✅ SSE endpoint accessible');
    } else if (sseResponse.status === 404) {
      console.log(
        '   ⚠️  SSE endpoint not found - deployment may not be complete',
      );
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log(
    '\n📋 VS Code Configuration (use this after successful deployment):',
  );
  console.log(
    JSON.stringify(
      {
        mcp: {
          servers: {
            'weather-server-deployed': {
              url: 'https://mcp-weather-server-o6o8.onrender.com/mcp',
              transportType: 'http',
              autoApprove: [],
              disabled: false,
              timeout: 30,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          },
        },
      },
      null,
      2,
    ),
  );
}

verifyDeployment().catch(console.error);
