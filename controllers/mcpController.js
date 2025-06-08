import axios from 'axios';
import { buildMCPResponse } from '../utils/mcpUtils.js';
import { validateMCPRequest } from '../utils/validation.js';
import endpoints from '../config/endpoints.js';
import { logger } from '../utils/logger.js';

export default {
  async handleMCPRequest(req, res) {
    try {
      // Validate incoming MCP request
      const { error, value: mcpContext } = validateMCPRequest(req.body);
      if (error) {
        logger.warn('Invalid MCP request:', error.details);
        return res.status(400).json({
          error: 'Invalid MCP request',
          details: error.details.map((d) => d.message),
        });
      }

      // Extract endpoint and params from context
      const { endpointName, queryParams, authHeaders } = mcpContext.input || {};

      if (!endpointName || !endpoints[endpointName]) {
        logger.warn(`Invalid or missing endpointName: ${endpointName}`);
        return res.status(400).json({
          error: 'Invalid or missing endpointName',
          availableEndpoints: Object.keys(endpoints),
        });
      } // Prepare request configuration
      const endpointConfig = endpoints[endpointName];

      // Merge defaultParams with queryParams, with queryParams taking precedence
      const mergedParams = {
        ...endpointConfig.defaultParams,
        ...queryParams,
      };

      const requestConfig = {
        params: mergedParams,
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'MCP-Weather-Server/1.0.0',
          ...authHeaders,
        },
      };
      logger.info(`Fetching data from endpoint: ${endpointName}`);

      // Fetch from the external endpoint
      const { data } = await axios.get(endpointConfig.url, requestConfig);

      // Transform data if transformer function exists
      const transformedData = endpointConfig.transformer
        ? endpointConfig.transformer(data)
        : data;

      // Build the updated MCP context
      const updatedContext = buildMCPResponse(
        mcpContext,
        transformedData,
        endpointName,
      );

      logger.info(`Successfully processed MCP request for: ${endpointName}`);
      res.json(updatedContext);
    } catch (err) {
      logger.error('Error processing MCP request:', err);

      if (err.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Request timeout',
          details: 'External API request timed out',
        });
      }

      if (err.response) {
        return res.status(502).json({
          error: 'External API error',
          details: `API returned ${err.response.status}: ${err.response.statusText}`,
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        details: err.message,
      });
    }
  },
};
