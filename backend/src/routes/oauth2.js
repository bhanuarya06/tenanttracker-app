const router = require('express').Router();
const oauth2 = require('../controllers/oauth2Controller');
const oauthAuth = require('../controllers/oauthAuthController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

// OIDC Discovery & JWKS
router.get('/.well-known/openid-configuration', asyncHandler(oauth2.discovery));
router.get('/.well-known/jwks.json', asyncHandler(oauth2.jwks));

// OAuth 2.0 Authorization Server
router.get('/oauth2/authorize', authenticate, asyncHandler(oauth2.authorize));
router.post('/oauth2/authorize', authenticate, asyncHandler(oauth2.authorizePost));
router.post('/oauth2/token', asyncHandler(oauth2.token));
router.post('/oauth2/revoke', asyncHandler(oauth2.revoke));
router.post('/oauth2/introspect', asyncHandler(oauth2.introspect));
router.get('/oauth2/userinfo', authenticate, asyncHandler(oauth2.userinfo));

// First-party convenience endpoints (BFF)
router.post('/auth/register', asyncHandler(oauth2.register));
router.post('/auth/login', asyncHandler(oauth2.login));
router.post('/auth/logout', authenticate, asyncHandler(oauth2.logout));
router.post('/auth/logout/all', authenticate, asyncHandler(oauth2.logoutAll));
router.get('/auth/sessions', authenticate, asyncHandler(oauth2.sessions));

// External OAuth provider callbacks (Google, GitHub)
router.post('/auth/oauth/:provider/callback', asyncHandler(oauthAuth.providerCallback));
router.post('/api/auth/oauth/:provider/callback', asyncHandler(oauthAuth.providerCallback));
router.post('/oauth/:provider/callback', asyncHandler(oauthAuth.providerCallback));
router.post('/api/oauth/:provider/callback', asyncHandler(oauthAuth.providerCallback));

// Token management
router.post('/auth/token/refresh', asyncHandler(oauthAuth.refreshToken));
router.post('/auth/token/revoke', asyncHandler(oauthAuth.revokeToken));

// User info
router.get('/auth/me', authenticate, asyncHandler(oauthAuth.getMe));

// Provider management
router.delete('/auth/oauth/:provider/unlink', authenticate, asyncHandler(oauthAuth.unlinkProvider));

module.exports = router;
