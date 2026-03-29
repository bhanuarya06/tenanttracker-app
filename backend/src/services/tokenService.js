const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');
const { RefreshToken } = require('../models');
const logger = require('../utils/logger');

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id,
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const generateRefreshToken = async (user, meta = {}) => {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = RefreshToken.hashToken(rawToken);
  const familyId = meta.familyId || crypto.randomUUID();

  await RefreshToken.create({
    tokenHash,
    user: user._id,
    familyId,
    fingerprint: meta.fingerprint || '',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdByIp: meta.ip || '',
    userAgent: meta.userAgent || '',
  });

  return { rawToken, familyId };
};

const rotateRefreshToken = async (rawToken) => {
  const existing = await RefreshToken.findByToken(rawToken);
  if (!existing) {
    logger.warn('Refresh token not found or expired');
    return null;
  }

  // Reuse the same token — allows multiple tabs without invalidating other sessions
  existing.lastUsedAt = new Date();
  await existing.save();

  return { rawToken, userId: existing.user };
};

const revokeRefreshToken = async (rawToken) => {
  const hash = RefreshToken.hashToken(rawToken);
  const token = await RefreshToken.findOne({ tokenHash: hash });
  if (token) {
    token.isRevoked = true;
    await token.save();
  }
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.revokeAllForUser(userId);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
