// Quick test script for root endpoint
import express from 'express';

const app = express();

app.get('/', (req, res) => {
  console.log('Root endpoint hit!');
  res.json({
    name: 'MCP Weather Server',
    status: 'running',
    message: 'Root endpoint working',
  });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
});
