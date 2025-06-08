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
 * Enhanced validation schemas for all supported endpoints
 */
const endpointSchemas = {
  getWeather: Joi.object({
    latitude: Joi.number().min(-90).max(90).precision(6).required().messages({
      'number.min': 'Latitude must be between -90 and 90 degrees',
      'number.max': 'Latitude must be between -90 and 90 degrees',
      'any.required': 'Latitude is required for weather requests',
    }),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .precision(6)
      .required()
      .messages({
        'number.min': 'Longitude must be between -180 and 180 degrees',
        'number.max': 'Longitude must be between -180 and 180 degrees',
        'any.required': 'Longitude is required for weather requests',
      }),
    current_weather: Joi.boolean().optional().default(true),
    daily: Joi.string()
      .pattern(/^[a-zA-Z0-9_,]+$/)
      .optional()
      .messages({
        'string.pattern.base':
          'Daily parameters must contain only alphanumeric characters, underscores, and commas',
      }),
    hourly: Joi.string()
      .pattern(/^[a-zA-Z0-9_,]+$/)
      .optional(),
    timezone: Joi.string().min(1).max(50).optional(),
    temperature_unit: Joi.string()
      .valid('celsius', 'fahrenheit')
      .optional()
      .default('celsius'),
    windspeed_unit: Joi.string()
      .valid('kmh', 'ms', 'mph', 'kn')
      .optional()
      .default('kmh'),
    precipitation_unit: Joi.string()
      .valid('mm', 'inch')
      .optional()
      .default('mm'),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
    past_days: Joi.number().min(0).max(92).optional(),
    forecast_days: Joi.number().min(1).max(16).optional().default(7),
  }),

  getCurrentWeather: Joi.object({
    latitude: Joi.number().min(-90).max(90).precision(6).required(),
    longitude: Joi.number().min(-180).max(180).precision(6).required(),
    temperature_unit: Joi.string()
      .valid('celsius', 'fahrenheit')
      .optional()
      .default('celsius'),
    windspeed_unit: Joi.string()
      .valid('kmh', 'ms', 'mph', 'kn')
      .optional()
      .default('kmh'),
  }),

  getUsers: Joi.object({
    _limit: Joi.number().min(1).max(100).optional().default(10).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
    _page: Joi.number().min(1).optional().default(1),
    _sort: Joi.string().valid('id', 'name', 'username', 'email').optional(),
    _order: Joi.string().valid('asc', 'desc').optional().default('asc'),
  }),

  getPosts: Joi.object({
    userId: Joi.number().min(1).max(10).optional().messages({
      'number.min': 'User ID must be a positive number',
      'number.max': 'User ID must be between 1 and 10',
    }),
    _limit: Joi.number().min(1).max(100).optional().default(10),
    _page: Joi.number().min(1).optional().default(1),
    _sort: Joi.string().valid('id', 'title', 'userId').optional(),
    _order: Joi.string().valid('asc', 'desc').optional().default('asc'),
    title_like: Joi.string().min(1).max(100).optional(),
    body_like: Joi.string().min(1).max(100).optional(),
  }),
};

/**
 * Validates query parameters for specific endpoints with enhanced error handling
 * @param {string} endpointName - Name of the endpoint
 * @param {Object} params - Query parameters to validate
 * @returns {Object} Validation result with detailed errors
 */
export function validateEndpointParams(endpointName, params) {
  const schema = endpointSchemas[endpointName];

  if (!schema) {
    return {
      error: null,
      value: params,
      warnings: [`No validation schema found for endpoint: ${endpointName}`],
    };
  }

  const result = schema.validate(params, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    convert: true,
  });

  if (result.error) {
    return {
      error: result.error,
      value: null,
      details: result.error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      })),
    };
  }

  return {
    error: null,
    value: result.value,
    sanitized: true,
  };
}

/**
 * Enhanced authentication validation schemas
 */
const authSchemas = {
  login: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
    }),
    remember: Joi.boolean().optional().default(false),
  }),

  apiKey: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    permissions: Joi.array()
      .items(Joi.string().valid('read', 'write', 'admin'))
      .optional()
      .default(['read']),
    expiresIn: Joi.string()
      .valid('1h', '1d', '7d', '30d', '1y', 'never')
      .optional()
      .default('30d'),
  }),
};

/**
 * Rate limiting validation
 */
const rateLimitSchema = Joi.object({
  windowMs: Joi.number().min(1000).max(86400000).optional().default(900000), // 1 second to 24 hours
  max: Joi.number().min(1).max(10000).optional().default(100),
  message: Joi.string().max(200).optional(),
  skipSuccessfulRequests: Joi.boolean().optional().default(false),
  skipFailedRequests: Joi.boolean().optional().default(false),
});

/**
 * Validates authentication requests
 * @param {string} type - Type of auth validation (login, apiKey)
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
export function validateAuthRequest(type, data) {
  const schema = authSchemas[type];

  if (!schema) {
    return {
      error: new Error(`Unknown authentication type: ${type}`),
      value: null,
    };
  }

  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
}

/**
 * Validates rate limit configuration
 * @param {Object} config - Rate limit configuration
 * @returns {Object} Validation result
 */
export function validateRateLimitConfig(config) {
  return rateLimitSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
}

/**
 * Advanced input sanitization with XSS and injection protection
 * @param {*} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {*} Sanitized input
 */
export function sanitizeInput(input, options = {}) {
  const {
    allowHtml = false,
    maxLength = 10000,
    allowedTags = [],
    stripSql = true,
  } = options;

  if (typeof input === 'string') {
    let sanitized = input;

    // Trim whitespace
    sanitized = sanitized.trim();

    // Length check
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // HTML/XSS protection
    if (!allowHtml) {
      sanitized = sanitized
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    // SQL injection protection
    if (stripSql) {
      sanitized = sanitized
        .replace(/['"`;\\]/g, '')
        .replace(
          /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi,
          '',
        );
    }

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item, options));
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeInput(key, { ...options, maxLength: 100 });
      sanitized[sanitizedKey] = sanitizeInput(value, options);
    }
    return sanitized;
  }

  return input;
}

/**
 * Validates IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP
 */
export function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    return ip.split('.').every((part) => parseInt(part) <= 255);
  }

  return ipv6Regex.test(ip);
}

/**
 * Validates geographic coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Validation result with precision suggestions
 */
export function validateCoordinates(lat, lon) {
  const errors = [];
  const warnings = [];

  // Basic range validation
  if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }
  if (lon < -180 || lon > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  } // Precision warnings (check first for specific precision issues)
  if (Math.abs(lat) <= 0.000001) {
    warnings.push('Latitude precision may be too high for weather data');
  }
  if (Math.abs(lon) <= 0.000001) {
    warnings.push('Longitude precision may be too high for weather data');
  }
  // Ocean check (simplified) - only if no precision warnings about very small values
  if (
    Math.abs(lat) < 1 &&
    Math.abs(lon) < 1 &&
    Math.abs(lat) > 0.000001 &&
    Math.abs(lon) > 0.000001
  ) {
    warnings.push(
      'Coordinates appear to be near the equator/prime meridian intersection',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedLat: Math.round(lat * 1000000) / 1000000, // 6 decimal places
    normalizedLon: Math.round(lon * 1000000) / 1000000,
  };
}
