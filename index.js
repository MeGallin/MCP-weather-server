import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mcpController from './controllers/mcpController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/mcp', mcpController.handleMCPRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`MCP server running on port ${PORT}`);
});
