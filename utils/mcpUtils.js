import { logger } from './logger.js';

/**
 * Builds an MCP-compliant response with tool results
 * @param {Object} originalContext - The original MCP context
 * @param {Object} fetchedData - Data fetched from external API
 * @param {string} endpointName - Name of the endpoint that was called
 * @returns {Object} Updated MCP context
 */
export function buildMCPResponse(originalContext, fetchedData, endpointName) {
  const now = new Date().toISOString();

  // Create tool result entry (per MCP conventions)
  const toolCall = {
    name: 'fetch_endpoint',
    input: {
      endpoint: endpointName,
      ...originalContext.input,
    },
    output: {
      success: true,
      data: fetchedData,
      metadata: {
        endpoint: endpointName,
        timestamp: now,
        dataSize: JSON.stringify(fetchedData).length,
      },
    },
    timestamp: now,
    duration: 0, // This could be calculated if needed
  };

  // Update context with new tool result
  const updatedContext = {
    ...originalContext,
    tools: [...(originalContext.tools || []), toolCall],
    metadata: {
      ...originalContext.metadata,
      last_updated: now,
      tool_count: (originalContext.tools?.length || 0) + 1,
      last_endpoint: endpointName,
    },
  };

  logger.debug('Built MCP response:', {
    endpointName,
    toolCount: updatedContext.metadata.tool_count,
  });

  return updatedContext;
}

/**
 * Builds an MCP error response
 * @param {Object} originalContext - The original MCP context
 * @param {string} errorMessage - Error message
 * @param {string} endpointName - Name of the endpoint that failed
 * @returns {Object} Updated MCP context with error
 */
export function buildMCPErrorResponse(
  originalContext,
  errorMessage,
  endpointName,
) {
  const now = new Date().toISOString();

  const toolCall = {
    name: 'fetch_endpoint',
    input: {
      endpoint: endpointName,
      ...originalContext.input,
    },
    output: {
      success: false,
      error: errorMessage,
      metadata: {
        endpoint: endpointName,
        timestamp: now,
      },
    },
    timestamp: now,
  };

  return {
    ...originalContext,
    tools: [...(originalContext.tools || []), toolCall],
    metadata: {
      ...originalContext.metadata,
      last_updated: now,
      last_error: errorMessage,
      last_endpoint: endpointName,
    },
  };
}

/**
 * Validates MCP context structure
 * @param {Object} context - MCP context to validate
 * @returns {boolean} True if valid MCP context
 */
export function isValidMCPContext(context) {
  if (!context || typeof context !== 'object') {
    return false;
  }

  // Check required MCP fields
  const hasInput = 'input' in context;
  const hasTools = Array.isArray(context.tools) || context.tools === undefined;
  const hasMetadata =
    typeof context.metadata === 'object' || context.metadata === undefined;

  return hasInput && hasTools && hasMetadata;
}
