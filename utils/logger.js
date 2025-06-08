import winston from 'winston';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;

// Ensure logs directory exists
const logsDir = 'logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, service, userId, endpoint, ip, ...meta }) => {
  let logString = `${timestamp} [${level.toUpperCase()}]`;
  
  if (service) logString += ` [${service}]`;
  if (userId) logString += ` [User:${userId}]`;
  if (endpoint) logString += ` [${endpoint}]`;
  if (ip) logString += ` [${ip}]`;
  
  logString += `: ${message}`;
  
  // Add metadata if present
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    logString += ` ${JSON.stringify(meta)}`;
  }
  
  return logString;
});

// Custom format for file output (structured JSON)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  json()
);

// Performance tracking format
const performanceFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  printf(({ timestamp, level, message, duration, endpoint, method, statusCode, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      type: 'performance',
      message,
      duration,
      endpoint,
      method,
      statusCode,
      ...meta
    });
  })
);

// Security events format
const securityFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  printf(({ timestamp, level, message, ip, userAgent, endpoint, action, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      type: 'security',
      message,
      ip,
      userAgent,
      endpoint,
      action,
      ...meta
    });
  })
);

// Create the main logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: 'mcp-weather-server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      silent: process.env.NODE_ENV === 'test'
    }),

    // Combined logs file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),

    // Error logs file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // Performance logs file
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      level: 'info',
      format: performanceFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Security logger for authentication and authorization events
export const securityLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { 
    service: 'mcp-weather-server-security',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      format: securityFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Performance logger for API response times and metrics
export const performanceLogger = winston.createLogger({
  level: 'info',
  defaultMeta: { 
    service: 'mcp-weather-server-performance',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      format: performanceFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

/**
 * Enhanced logging functions with structured data
 */

// Request logging helper
export const logRequest = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    duration,
    userId: req.user?.id,
    username: req.user?.username,
    contentLength: res.get('Content-Length'),
    referer: req.get('Referer')
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP request completed with error', logData);
  } else {
    logger.info('HTTP request completed', logData);
  }

  // Also log to performance logger if duration is significant
  if (duration > 1000) {
    performanceLogger.warn('Slow request detected', logData);
  }
};

// Security event logging
export const logSecurityEvent = (action, req, additionalData = {}) => {
  const securityData = {
    action,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method,
    userId: req.user?.id,
    username: req.user?.username,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  securityLogger.warn(`Security event: ${action}`, securityData);
  
  // Also log to main logger for critical security events
  if (['login_failed', 'rate_limit_exceeded', 'invalid_token'].includes(action)) {
    logger.warn(`Security alert: ${action}`, securityData);
  }
};

// API performance logging
export const logAPIPerformance = (endpoint, duration, success, additionalData = {}) => {
  const perfData = {
    endpoint,
    duration,
    success,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  performanceLogger.info('API performance metric', perfData);
  
  // Log warnings for slow APIs
  if (duration > 5000) {
    logger.warn('Slow external API response', perfData);
  }
};

// Error logging with context
export const logError = (error, context = {}) => {
  const errorData = {
    error: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode || error.status,
    timestamp: new Date().toISOString(),
    ...context
  };

  logger.error('Application error occurred', errorData);
};

// Rate limit logging
export const logRateLimit = (req, limiterName, remaining, resetTime) => {
  const rateLimitData = {
    limiter: limiterName,
    ip: req.ip,
    endpoint: req.path,
    method: req.method,
    remaining,
    resetTime,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  };

  logger.warn('Rate limit applied', rateLimitData);
  logSecurityEvent('rate_limit_applied', req, { limiter: limiterName, remaining });
};

// Authentication logging
export const logAuth = (action, req, success, additionalData = {}) => {
  const authData = {
    action,
    success,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  if (success) {
    logger.info(`Authentication ${action} successful`, authData);
  } else {
    logger.warn(`Authentication ${action} failed`, authData);
    logSecurityEvent(`auth_${action}_failed`, req, additionalData);
  }
};

export default logger;
