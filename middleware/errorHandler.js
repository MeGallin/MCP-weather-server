import { logger } from '../utils/logger.js';

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  logger.error(`Error processing ${req.method} ${req.path}:`, {
    error: err.message,
    stack: err.stack,
    body: req.body,
    headers: req.headers,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      details: 'Request body contains invalid JSON',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service Unavailable',
      details: 'External service is not available',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.code === 'ENOTFOUND') {
    return res.status(502).json({
      error: 'Bad Gateway',
      details: 'External service could not be reached',
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message;

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 handler for unknown routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export function notFoundHandler(req, res) {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);

  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString(),
  });
}
