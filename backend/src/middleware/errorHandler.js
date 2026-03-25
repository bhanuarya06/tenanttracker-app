const logger = require('../utils/logger');
const { sendError, formatValidationError } = require('../utils/response');
const config = require('../config/config');

const errorHandler = (err, req, res) => {
  logger.error('Error:', { message: err.message, stack: err.stack, url: req.originalUrl });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return sendError(res, formatValidationError(err), 400);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, `Invalid ${err.path}: ${err.value}`, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return sendError(res, `Duplicate value for ${field}`, 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Operational errors (our AppError)
  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode || 500);
  }

  // Unknown errors
  const message = config.env === 'development' ? err.message : 'Internal server error';
  return sendError(res, message, 500);
};

const notFoundHandler = (req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFoundHandler, asyncHandler };
