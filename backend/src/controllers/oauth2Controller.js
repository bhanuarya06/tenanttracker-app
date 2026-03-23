const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AuthorizationCode = require('../models/AuthorizationCode');
const tokenService = require('../services/tokenService');
const oidcService = require('../services/oidcService');
const keyManager = require('../services/keyManager');
const config = require('../config/config');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

// ─── OIDC Discovery ──────────────────────────────

const discovery = (req, res) => {
  const doc = oidcService.getDiscoveryDocument();
  res.set('Cache-Control', 'public, max-age=86400');
  res.json(doc);
};

const jwks = (req, res) => {
  const jwksDoc = keyManager.getJwks();
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(jwksDoc);
};

// ─── Authorization Code Flow ─────────────────────

const authorize = (req, res) => {
  const {
    response_type, client_id, redirect_uri,
    code_challenge, code_challenge_method,
    scope, state, nonce,
  } = req.query;

  const errors = [];
  if (response_type !== 'code') errors.push('response_type must be "code"');
  if (!client_id || client_id !== config.oidc.clientId) errors.push('Invalid client_id');
  if (!redirect_uri || !config.oidc.allowedRedirectUris.includes(redirect_uri)) errors.push('Invalid redirect_uri');
  if (!code_challenge) errors.push('code_challenge is required (PKCE)');
  if (code_challenge_method !== 'S256') errors.push('code_challenge_method must be "S256"');
  if (!state) errors.push('state is required');

  if (errors.length > 0) {
    return res.status(400).json({ error: 'invalid_request', error_description: errors.join('; ') });
  }

  const requestedScopes = (scope || 'openid').split(' ').filter(Boolean);
  const validScopes = ['openid', 'profile', 'email', 'offline_access'];
  const invalid = requestedScopes.filter(s => !validScopes.includes(s));
  if (invalid.length > 0) {
    return res.status(400).json({ error: 'invalid_scope', error_description: `Invalid scopes: ${invalid.join(', ')}` });
  }

  return res.json({
    authorization_request: {
      response_type, client_id, redirect_uri,
      code_challenge, code_challenge_method,
      scope: requestedScopes.join(' '), state, nonce: nonce || null,
    },
  });
};

const authorizePost = async (req, res) => {
  const {
    email, password, client_id, redirect_uri,
    code_challenge, code_challenge_method, scope, state, nonce,
  } = req.body;

  if (!client_id || client_id !== config.oidc.clientId) {
    return res.status(400).json({ error: 'invalid_client', error_description: 'Invalid client_id' });
  }
  if (!redirect_uri || !config.oidc.allowedRedirectUris.includes(redirect_uri)) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' });
  }
  if (!code_challenge || code_challenge_method !== 'S256') {
    return res.status(400).json({ error: 'invalid_request', error_description: 'PKCE is required' });
  }

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    return res.status(401).json({ error: 'access_denied', error_description: 'Invalid credentials', state });
  }
  if (user.isLocked) {
    return res.status(423).json({ error: 'access_denied', error_description: 'Account is temporarily locked', state });
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    await user.incLoginAttempts();
    return res.status(401).json({ error: 'access_denied', error_description: 'Invalid credentials', state });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'access_denied', error_description: 'Account is not active', state });
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );

  const requestedScopes = (scope || 'openid').split(' ').filter(Boolean);
  const code = crypto.randomBytes(32).toString('base64url');

  await AuthorizationCode.create({
    code,
    user: user._id,
    clientId: client_id,
    redirectUri: redirect_uri,
    scopes: requestedScopes,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method || 'S256',
    nonce: nonce || null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  logger.info(`Authorization code issued for user ${user._id}`, { clientId: client_id, scopes: requestedScopes });
  return res.json({ code, state });
};

// ─── Token Endpoint ──────────────────────────────

const token = async (req, res) => {
  const { grant_type } = req.body;
  switch (grant_type) {
    case 'authorization_code':
      return _handleAuthorizationCodeGrant(req, res);
    case 'refresh_token':
      return _handleRefreshTokenGrant(req, res);
    default:
      return res.status(400).json({ error: 'unsupported_grant_type', error_description: `Unsupported: "${grant_type}"` });
  }
};

const _handleAuthorizationCodeGrant = async (req, res) => {
  const { code, redirect_uri, client_id, code_verifier } = req.body;
  if (!code || !redirect_uri || !client_id || !code_verifier) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
  }

  const authCode = await AuthorizationCode.findValidCode(code);
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
  }
  if (authCode.clientId !== client_id) {
    await authCode.markUsed();
    return res.status(400).json({ error: 'invalid_grant', error_description: 'client_id mismatch' });
  }
  if (authCode.redirectUri !== redirect_uri) {
    await authCode.markUsed();
    return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
  }

  const computedChallenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
  if (computedChallenge !== authCode.codeChallenge) {
    await authCode.markUsed();
    return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
  }

  await authCode.markUsed();

  const user = await User.findById(authCode.user);
  if (!user || !user.isActive) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'User not found or inactive' });
  }

  const scopes = authCode.scopes;
  const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
  const accessToken = tokenService.generateAccessToken(user);

  let idToken = null;
  if (scopes.includes('openid')) {
    idToken = _generateIdToken(user, scopes, authCode.nonce, accessToken);
  }

  let refreshToken = null;
  if (scopes.includes('offline_access')) {
    const result = await tokenService.generateRefreshToken(user, meta);
    refreshToken = result.rawToken;
    _setRefreshTokenCookie(res, refreshToken);
  }

  const response = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
    scope: scopes.join(' '),
  };
  if (idToken) response.id_token = idToken;
  if (refreshToken) response.refresh_token = refreshToken;

  return res.json(response);
};

const _handleRefreshTokenGrant = async (req, res) => {
  const rawRefreshToken = req.body.refresh_token || req.cookies?.refresh_token;
  if (!rawRefreshToken) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh_token' });
  }

  const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
  const result = await tokenService.rotateRefreshToken(rawRefreshToken, meta);
  if (!result) {
    _clearRefreshTokenCookie(res);
    return res.status(401).json({ error: 'invalid_grant', error_description: 'Refresh token invalid or revoked' });
  }

  _setRefreshTokenCookie(res, result.rawToken);
  const user = await User.findById(result.userId);
  const accessToken = tokenService.generateAccessToken(user);

  return res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
  });
};

// ─── Token Management ────────────────────────────

const revoke = async (req, res) => {
  const rawToken = req.body.token || req.cookies?.refresh_token;
  if (rawToken) {
    await tokenService.revokeRefreshToken(rawToken);
  }
  _clearRefreshTokenCookie(res);
  return res.status(200).json({ success: true });
};

const introspect = async (req, res) => {
  const { token: tkn } = req.body;
  if (!tkn) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'token is required' });
  }

  try {
    const decoded = jwt.verify(tkn, config.jwt.secret);
    return res.json({ active: true, sub: decoded.sub, exp: decoded.exp, scope: decoded.scope || '' });
  } catch {
    return res.json({ active: false });
  }
};

// ─── OIDC UserInfo ───────────────────────────────

const userinfo = async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'invalid_request', error_description: 'User not found' });
  }
  const scopes = ['openid', 'profile', 'email'];
  const claims = oidcService.getUserInfoClaims(user, scopes);
  return res.json(claims);
};

// ─── First-Party Convenience Endpoints ───────────

const register = async (req, res) => {
  try {
    const { email } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 'User with this email already exists', 400);

    const userData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'owner',
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
      gender: req.body.gender,
      address: req.body.address,
      bio: req.body.bio,
    };
    Object.keys(userData).forEach(k => { if (userData[k] === undefined) delete userData[k]; });

    const user = await User.create(userData);
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
    const accessToken = tokenService.generateAccessToken(user);
    const idToken = _generateIdToken(user, ['openid', 'profile', 'email'], null, accessToken);
    const { rawToken: refreshToken } = await tokenService.generateRefreshToken(user, meta);

    _setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, 'User registered successfully', {
      user: _formatUser(user),
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: 900,
    }, null, 201);
  } catch (error) {
    logger.error('OAuth2 registration error:', error);
    return sendError(res, 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
    if (!user) return sendError(res, 'Invalid email or password', 401);
    if (user.isLocked) return sendError(res, 'Account is temporarily locked', 423);

    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incLoginAttempts();
      return sendError(res, 'Invalid email or password', 401);
    }
    if (!user.isActive) return sendError(res, 'Account is not active', 403);

    await User.updateOne(
      { _id: user._id },
      { $set: { loginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
    );

    const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
    const accessToken = tokenService.generateAccessToken(user);
    const idToken = _generateIdToken(user, ['openid', 'profile', 'email'], null, accessToken);
    const { rawToken: refreshToken } = await tokenService.generateRefreshToken(user, meta);

    _setRefreshTokenCookie(res, refreshToken);

    return sendSuccess(res, 'Login successful', {
      user: _formatUser(user),
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: 900,
    });
  } catch (error) {
    logger.error('OAuth2 login error:', error);
    return sendError(res, 'Login failed', 500);
  }
};

const logoutOAuth = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }
    _clearRefreshTokenCookie(res);
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    return sendError(res, 'Logout failed', 500);
  }
};

const sessions = async (req, res) => {
  try {
    const { RefreshToken } = require('../models');
    const tokens = await RefreshToken.find({
      user: req.user.userId,
      isRevoked: false,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return sendSuccess(res, 'Active sessions retrieved', {
      sessions: tokens.map(s => ({
        id: s._id,
        ip: s.createdByIp,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
      })),
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    return sendError(res, 'Failed to retrieve sessions', 500);
  }
};

const logoutAll = async (req, res) => {
  try {
    await tokenService.revokeAllUserTokens(req.user.userId);
    _clearRefreshTokenCookie(res);
    return sendSuccess(res, 'All sessions revoked successfully');
  } catch (error) {
    logger.error('Logout all error:', error);
    return sendError(res, 'Failed to revoke all sessions', 500);
  }
};

// ─── Helpers ─────────────────────────────────────

function _generateIdToken(user, scopes, nonce, accessToken) {
  const atHash = crypto.createHash('sha256').update(accessToken).digest();
  const claims = {
    sub: user._id.toString(),
    email: user.email,
    email_verified: user.isEmailVerified || false,
    name: `${user.firstName} ${user.lastName || ''}`.trim(),
    given_name: user.firstName,
    family_name: user.lastName || '',
    iat: Math.floor(Date.now() / 1000),
    auth_time: Math.floor(Date.now() / 1000),
    at_hash: atHash.subarray(0, 16).toString('base64url'),
  };
  if (nonce) claims.nonce = nonce;
  if (user.avatar) claims.picture = user.avatar;

  return jwt.sign(claims, keyManager.privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: config.oidc.issuer,
    audience: config.oidc.clientId,
    keyid: keyManager.keyId,
  });
}

function _setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function _clearRefreshTokenCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function _formatUser(user) {
  return {
    _id: user._id,
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    bio: user.bio,
    address: user.address,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    fullName: user.fullName,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    oauthProviders: (user.oauthProviders || []).map(p => ({
      provider: p.provider,
      email: p.email,
      displayName: p.displayName,
      linkedAt: p.linkedAt,
    })),
  };
}

module.exports = {
  discovery, jwks, authorize, authorizePost, token, revoke, introspect,
  userinfo, register, login, logout: logoutOAuth, sessions, logoutAll,
};
