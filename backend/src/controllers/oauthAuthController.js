const { User } = require('../models');
const tokenService = require('../services/tokenService');
const oauthProviderService = require('../services/oauthProviderService');
const config = require('../config/config');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

// POST /auth/oauth/:provider/callback
const providerCallback = async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, code_verifier, nonce, redirect_uri } = req.body;

    if (!['google', 'github'].includes(provider)) {
      return sendError(res, `Unsupported OAuth provider: ${provider}`, 400);
    }
    if (!oauthProviderService.isProviderConfigured(provider)) {
      return sendError(res, `OAuth provider "${provider}" is not configured`, 400);
    }
    if (!code) {
      return sendError(res, 'Authorization code is required', 400);
    }

    const profile = await oauthProviderService.exchangeCodeForProfile(
      provider, { code, code_verifier, nonce, redirect_uri }
    );

    const { user, isNewUser } = await _findOrCreateUser(profile);

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
    const accessToken = tokenService.generateAccessToken(user);
    const { rawToken: refreshToken } = await tokenService.generateRefreshToken(user, meta);

    _setRefreshTokenCookie(res, refreshToken);

    logger.info(`User authenticated via ${provider}: ${user.email}`, { userId: user._id, isNewUser, provider });

    return sendSuccess(res, isNewUser ? 'Account created successfully' : 'Login successful', {
      user: _formatUser(user),
      token: accessToken,
      expiresIn: 900,
    });
  } catch (error) {
    logger.error(`OAuth ${req.params.provider} callback error:`, error);
    const message = error.message?.includes('exchange')
      ? 'Failed to authenticate with provider. Please try again.'
      : error.message || 'OAuth authentication failed';
    return sendError(res, message, 401);
  }
};

// POST /auth/token/refresh (OAuth version)
const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      return sendError(res, 'No refresh token provided', 401);
    }

    const meta = { ip: req.ip, userAgent: req.get('User-Agent') };
    const result = await tokenService.rotateRefreshToken(rawRefreshToken, meta);
    if (!result) {
      _clearRefreshTokenCookie(res);
      return sendError(res, 'Refresh token is invalid or expired', 401);
    }

    _setRefreshTokenCookie(res, result.rawToken);
    const user = await User.findById(result.userId);
    const accessToken = tokenService.generateAccessToken(user);

    return sendSuccess(res, 'Token refreshed successfully', {
      token: accessToken,
      expiresIn: 900,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    _clearRefreshTokenCookie(res);
    return sendError(res, 'Token refresh failed', 401);
  }
};

// POST /auth/token/revoke
const revokeToken = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refresh_token;
    if (rawRefreshToken) {
      await tokenService.revokeRefreshToken(rawRefreshToken);
    }
    _clearRefreshTokenCookie(res);
    return sendSuccess(res, 'Token revoked successfully');
  } catch (error) {
    logger.error('Token revocation error:', error);
    _clearRefreshTokenCookie(res);
    return sendSuccess(res, 'Token revoked');
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, 'User retrieved successfully', { user: _formatUser(user) });
  } catch (error) {
    logger.error('Get me error:', error);
    return sendError(res, 'Failed to retrieve user', 500);
  }
};

// DELETE /auth/oauth/:provider/unlink
const unlinkProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    if (!['google', 'github'].includes(provider)) {
      return sendError(res, `Unsupported provider: ${provider}`, 400);
    }

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) return sendError(res, 'User not found', 404);

    const providerIndex = user.oauthProviders.findIndex(p => p.provider === provider);
    if (providerIndex === -1) {
      return sendError(res, `${provider} is not linked to your account`, 400);
    }

    const hasPassword = !!user.password;
    const otherProviders = user.oauthProviders.filter(p => p.provider !== provider);
    if (!hasPassword && otherProviders.length === 0) {
      return sendError(res, 'Cannot unlink — this is your only login method. Set a password first.', 400);
    }

    user.oauthProviders.splice(providerIndex, 1);
    await user.save();

    logger.info(`Provider ${provider} unlinked from user ${req.user.userId}`);
    return sendSuccess(res, `${provider} account unlinked successfully`, { user: _formatUser(user) });
  } catch (error) {
    logger.error('Unlink provider error:', error);
    return sendError(res, 'Failed to unlink provider', 500);
  }
};

// ─── Helpers ─────────────────────────────────────

async function _findOrCreateUser(profile) {
  const { provider, providerId, email, emailVerified, firstName, lastName, avatar } = profile;

  // 1. Check by provider + providerId
  let user = await User.findOne({
    'oauthProviders.provider': provider,
    'oauthProviders.providerId': providerId,
  }).select('+password');
  if (user) return { user, isNewUser: false };

  // 2. Check by email → link provider
  user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (user) {
    user.oauthProviders.push({
      provider, providerId, email,
      displayName: `${firstName} ${lastName}`.trim(),
      avatar, linkedAt: new Date(),
    });
    if (!user.avatar && avatar) user.avatar = avatar;
    if (emailVerified && !user.isEmailVerified) user.isEmailVerified = true;
    await user.save();
    logger.info(`Linked ${provider} to existing user: ${email}`, { userId: user._id });
    return { user, isNewUser: false };
  }

  // 3. Create new user
  user = await User.create({
    firstName, lastName,
    email: email.toLowerCase(),
    role: 'owner',
    avatar,
    isActive: true,
    isEmailVerified: emailVerified || false,
    oauthProviders: [{ provider, providerId, email, displayName: `${firstName} ${lastName}`.trim(), avatar, linkedAt: new Date() }],
  });

  logger.info(`New user created via ${provider}: ${email}`, { userId: user._id });
  return { user, isNewUser: true };
}

function _setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function _clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
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
    hasPassword: !!user.password,
    oauthProviders: (user.oauthProviders || []).map(p => ({
      provider: p.provider,
      email: p.email,
      displayName: p.displayName,
      linkedAt: p.linkedAt,
    })),
  };
}

module.exports = { providerCallback, refreshToken, revokeToken, getMe, unlinkProvider };
