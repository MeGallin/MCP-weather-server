// Test the public MCP endpoint without authentication
import axios from 'axios';

const SERVER_URL = 'https://mcp-weather-server-o6o8.onrender.com';

async function testPublicMCPEndpoint() {
  console.log('🧪 Testing public MCP endpoint...');

  try {
    // Test basic MCP initialization request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true,
          },
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    console.log('📤 Sending initialize request...');

    const response = await axios.post(`${SERVER_URL}/mcp`, initRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ Response status:', response.status);
    console.log('📥 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log(
        '🎉 Public MCP endpoint is working! VS Code should be able to connect.',
      );
    } else {
      console.log('⚠️ Unexpected status code:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing MCP endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test SSE endpoint
async function testSSEEndpoint() {
  console.log('\n🧪 Testing SSE endpoint...');

  try {
    const response = await axios.get(`${SERVER_URL}/mcp`, {
      headers: {
        Accept: 'text/event-stream',
      },
      timeout: 5000,
      responseType: 'stream',
    });

    console.log('✅ SSE endpoint status:', response.status);
    console.log('📥 SSE headers:', response.headers);
    console.log('🎉 SSE endpoint is accessible!');
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log(
        '✅ SSE endpoint opened (connection timeout expected for streaming)',
      );
    } else {
      console.error('❌ Error testing SSE endpoint:', error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Testing MCP Weather Server Public Access\n');

  await testPublicMCPEndpoint();
  await testSSEEndpoint();

  console.log('\n📋 VS Code Configuration:');
  console.log('Add this to your VS Code settings.json:');
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

runTests().catch(console.error);
