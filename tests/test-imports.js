// Test imports
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { validateMCPRequest } from './utils/validation.js';
import { buildMCPResponse } from './utils/mcpUtils.js';
import endpoints from './config/endpoints.js';

console.log('All imports successful!');
console.log('Available endpoints:', Object.keys(endpoints));
