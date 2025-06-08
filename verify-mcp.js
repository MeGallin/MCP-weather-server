#!/usr/bin/env node

/**
 * Simple verification script for MCP Weather Server
 */

console.log('=== MCP Weather Server Verification ===\n');

try {
  // Import the MCP server module
  const { server, weatherTools } = await import('./mcp-weather-stdio.js');

  console.log('✅ MCP server module loaded successfully');
  console.log('✅ Available weather tools:');

  Object.values(weatherTools).forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name}: ${tool.description}`);
  });

  console.log('\n✅ MCP Weather Server is ready for VS Code integration!');
  console.log('\nTo use with VS Code:');
  console.log('1. Install the MCP extension in VS Code');
  console.log('2. Add the server configuration to your VS Code settings:');
  console.log('   (See vscode-settings-example.json for configuration)');
} catch (error) {
  console.error('❌ Error loading MCP server:', error.message);
  process.exit(1);
}
