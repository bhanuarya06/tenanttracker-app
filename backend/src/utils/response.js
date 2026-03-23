class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const sendResponse = (res, statusCode, success, message, data = null, pagination = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, message, data, pagination, statusCode = 200) =>
  sendResponse(res, statusCode, true, message, data, pagination);

const sendError = (res, message, statusCode = 500, data = null) =>
  sendResponse(res, statusCode, false, message, data);

const formatValidationError = (error) => {
  if (error.errors) {
    return Object.values(error.errors)
      .map((e) => e.message)
      .join(', ');
  }
  return error.message;
};

module.exports = { AppError, sendResponse, sendSuccess, sendError, formatValidationError };
