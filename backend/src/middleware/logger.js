const morgan = require('morgan');
const logger = require('../utils/logger');

const stream = { write: (message) => logger.http(message.trim()) };

const httpLogger = morgan('short', { stream });

module.exports = httpLogger;
