import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { logger } from '../utils/logger.js';

/**
 * General rate limiter for all endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict rate limiter for MCP endpoints
 */
export const mcpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 MCP requests per 5 minutes
  message: {
    error: 'MCP rate limit exceeded',
    message: 'Too many MCP requests. Please slow down.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  },
  handler: (req, res) => {
    logger.warn('MCP rate limit exceeded', {
      identifier: req.user?.id ? `user:${req.user.id}` : req.ip,
      userId: req.user?.id,
      username: req.user?.username,
      endpoint: req.path
    });
    res.status(429).json({
      error: 'MCP rate limit exceeded',
      message: 'Too many MCP requests. Please slow down.',
      retryAfter: '5 minutes'
    });
  }
});

/**
 * Speed limiter for resource-intensive endpoints
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  },
  // Removed deprecated onLimitReached
  validate: {
    delayMs: false // Disable delayMs validation warning
  }
});

/**
 * Authentication endpoint rate limiter (stricter for security)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts. Try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Weather API rate limiter (moderate limits for external API protection)
 */
export const weatherLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 weather requests per 10 minutes
  message: {
    error: 'Weather API rate limit exceeded',
    message: 'Too many weather requests. Please wait before making more requests.',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  },
  handler: (req, res) => {
    logger.warn('Weather API rate limit exceeded', {
      identifier: req.user?.id ? `user:${req.user.id}` : req.ip,
      userId: req.user?.id,
      endpoint: req.path
    });
    res.status(429).json({
      error: 'Weather API rate limit exceeded',
      message: 'Too many weather requests. Please wait before making more requests.',
      retryAfter: '10 minutes'
    });
  }
});

/**
 * Custom rate limiter factory
 * Creates rate limiters with custom configuration
 */
export const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
    handler: (req, res) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        limiterName: options.name || 'custom',
        windowMs: options.windowMs || defaultOptions.windowMs,
        max: options.max || defaultOptions.max
      });
      res.status(429).json(options.message || defaultOptions.message);
    }
  });
};

/**
 * Rate limit status middleware
 * Adds rate limit information to response headers
 */
export const rateLimitStatus = (req, res, next) => {
  // This middleware can be used to add custom rate limit headers
  // or perform additional logging
  const originalSend = res.send;
  
  res.send = function(data) {
    // Add custom headers if needed
    if (req.rateLimit) {
      res.set({
        'X-Custom-RateLimit-Remaining': req.rateLimit.remaining,
        'X-Custom-RateLimit-Reset': new Date(Date.now() + req.rateLimit.resetTime)
      });
    }
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * IP whitelist middleware
 * Bypasses rate limiting for whitelisted IPs
 */
export const createIPWhitelist = (whitelistedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelistedIPs.includes(clientIP)) {
      logger.info('IP whitelisted - bypassing rate limits', { ip: clientIP });
      req.skipRateLimit = true;
    }
    
    next();
  };
};

// Export rate limiter configurations for different use cases
export const rateLimiterConfigs = {
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'General rate limit exceeded'
  },
  mcp: {
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'MCP rate limit exceeded'
  },
  weather: {
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: 'Weather API rate limit exceeded'
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Authentication rate limit exceeded'
  }
};
