import Joi from 'joi';

// MCP request validation schema
const mcpRequestSchema = Joi.object({
  input: Joi.object({
    endpointName: Joi.string().required(),
    queryParams: Joi.object().optional(),
    authHeaders: Joi.object().optional(),
  }).required(),

  history: Joi.array().optional(),

  tools: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        input: Joi.object().optional(),
        output: Joi.object().optional(),
        timestamp: Joi.string().isoDate().optional(),
        duration: Joi.number().optional(),
      }),
    )
    .optional(),

  metadata: Joi.object().optional(),
}).options({ allowUnknown: true });

/**
 * Validates an MCP request body
 * @param {Object} requestBody - The request body to validate
 * @returns {Object} Joi validation result
 */
export function validateMCPRequest(requestBody) {
  return mcpRequestSchema.validate(requestBody, {
    abortEarly: false,
    stripUnknown: false,
  });
}

/**
 * Validates query parameters for specific endpoints
 * @param {string} endpointName - Name of the endpoint
 * @param {Object} params - Query parameters to validate
 * @returns {Object} Validation result
 */
export function validateEndpointParams(endpointName, params) {
  const schemas = {
    getWeather: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      current_weather: Joi.boolean().optional(),
      daily: Joi.string().optional(),
      timezone: Joi.string().optional(),
    }),

    getCurrentWeather: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
    }),

    getUsers: Joi.object({
      _limit: Joi.number().min(1).max(100).optional(),
      _page: Joi.number().min(1).optional(),
    }),

    getPosts: Joi.object({
      userId: Joi.number().optional(),
      _limit: Joi.number().min(1).max(100).optional(),
      _page: Joi.number().min(1).optional(),
    }),
  };

  const schema = schemas[endpointName];
  if (!schema) {
    return { error: null, value: params }; // No validation for unknown endpoints
  }

  return schema.validate(params, {
    abortEarly: false,
    stripUnknown: true,
  });
}

/**
 * Sanitizes input data to prevent injection attacks
 * @param {*} input - Input to sanitize
 * @returns {*} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/[<>\"']/g, '');
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}
