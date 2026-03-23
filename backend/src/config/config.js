const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tenanttracker',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'TenantTracker <noreply@tenanttracker.com>',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
  oidc: {
    issuer: process.env.OIDC_ISSUER || 'http://localhost:5001',
    clientId: process.env.OIDC_CLIENT_ID || 'tenanttracker-spa',
    allowedRedirectUris: (process.env.OIDC_REDIRECT_URIS || 'http://localhost:5173/auth/callback').split(','),
  },
  rsa: {
    privateKey: process.env.RSA_PRIVATE_KEY || '',
    publicKey: process.env.RSA_PUBLIC_KEY || '',
    keyId: process.env.RSA_KEY_ID || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
