import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

// Simple in-memory user store for demo purposes
// In production, this should be replaced with a proper database
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$xyz...', // This would be a real bcrypt hash
    role: 'admin',
    apiKey: 'mcp-admin-key-12345',
  },
  {
    id: 2,
    username: 'user',
    password: '$2a$10$abc...', // This would be a real bcrypt hash
    role: 'user',
    apiKey: 'mcp-user-key-67890',
  },
];

/**
 * JWT Authentication Middleware
 * Validates JWT tokens in Authorization header
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
    );
    req.user = decoded;
    logger.info('User authenticated successfully', {
      userId: decoded.id,
      username: decoded.username,
    });
    next();
  } catch (err) {
    logger.warn('Authentication failed: Invalid token', {
      ip: req.ip,
      error: err.message,
    });
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Token verification failed',
    });
  }
};

/**
 * API Key Authentication Middleware
 * Validates API keys in X-API-Key header
 */
export const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('API Key authentication failed: No API key provided', {
      ip: req.ip,
      endpoint: req.path,
    });
    return res.status(401).json({
      error: 'Access denied',
      message: 'API key required',
    });
  }

  // Find user by API key
  const user = users.find((u) => u.apiKey === apiKey);

  if (!user) {
    logger.warn('API Key authentication failed: Invalid API key', {
      ip: req.ip,
      apiKey: apiKey.substring(0, 8) + '***', // Log partial key for security
    });
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'API key not found or inactive',
    });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
  };

  logger.info('API Key authentication successful', {
    userId: user.id,
    username: user.username,
    endpoint: req.path,
  });

  next();
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't reject if no auth provided
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader) {
    // Try JWT authentication
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key',
      );
      req.user = decoded;
      logger.info('Optional authentication: JWT successful', {
        userId: decoded.id,
      });
    } catch (err) {
      logger.debug('Optional authentication: JWT failed', {
        error: err.message,
      });
    }
  } else if (apiKey) {
    // Try API key authentication
    const user = users.find((u) => u.apiKey === apiKey);
    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      logger.info('Optional authentication: API key successful', {
        userId: user.id,
      });
    } else {
      logger.debug('Optional authentication: API key failed');
    }
  }

  // Continue regardless of authentication status
  next();
};

/**
 * Role-based Authorization Middleware
 * Requires specific roles for access
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
    }

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRoles,
        requiredRoles,
      });
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${requiredRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' },
  );
};

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Authenticate user with username and password
 */
export const authenticateUser = async (username, password) => {
  try {
    const user = users.find((u) => u.username === username);
    if (!user) {
      return null;
    }

    // In a real application, you would compare with bcrypt
    // For demo purposes, we'll do a simple comparison
    const isValid =
      user.password === password ||
      (await comparePassword(password, user.password));

    if (isValid) {
      return user;
    }

    return null;
  } catch (error) {
    logger.error('Authentication error:', error);
    return null;
  }
};

/**
 * Generate API key for user
 */
export const generateApiKey = (
  user,
  keyName = 'default',
  permissions = ['read'],
) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `mcp-${user.role}-${user.id}-${timestamp}-${random}`;
};

/**
 * Middleware aliases for consistency
 */
export const authenticateToken = authenticateJWT;
export const authenticateApiKey = authenticateAPIKey;

/**
 * Login endpoint handler
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username and password are required',
      });
    }

    // Find user
    const user = users.find((u) => u.username === username);
    if (!user) {
      logger.warn('Login failed: User not found', { username });
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials',
      });
    }

    // For demo purposes, we'll just check if password is 'password'
    // In production, use comparePassword function
    const isValidPassword = password === 'password';

    if (!isValidPassword) {
      logger.warn('Login failed: Invalid password', { username });
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken(user);

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed',
    });
  }
};
