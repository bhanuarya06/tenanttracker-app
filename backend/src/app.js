const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const httpLogger = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');

const app = express();

// Security headers
app.set('trust proxy', 1);
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// HTTP request logging
app.use(httpLogger);

// Rate limiting (production only)
if (config.env === 'production') {
  app.use('/auth', authLimiter);
  app.use('/api', apiLimiter);
}

// Serve uploaded files
if (process.env.UPLOADS_BUCKET) {
  // Lambda: redirect legacy /uploads/:filename URLs to S3
  app.get('/uploads/:filename', (req, res) => {
    const region = process.env.AWS_UPLOADS_REGION || 'us-east-1';
    res.redirect(302, `https://${process.env.UPLOADS_BUCKET}.s3.${region}.amazonaws.com/${req.params.filename}`);
  });
} else {
  const path = require('path');
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Routes
app.use(routes);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
