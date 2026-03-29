const rateLimit = require('express-rate-limit');

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const apiLimiter = createLimiter(5, 100, 'Too many requests, please try again later');
const authLimiter = createLimiter(5, 30, 'Too many auth attempts, please try again later');
const paymentLimiter = createLimiter(15, 30, 'Too many payment requests, please try again later');

module.exports = { apiLimiter, authLimiter, paymentLimiter };
