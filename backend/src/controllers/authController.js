const crypto = require('crypto');
const { User } = require('../models');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');
const { sendSuccess, sendError } = require('../utils/response');
const config = require('../config/config');

const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('refreshToken', { httpOnly: true, path: '/' });
};

const formatUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  phone: user.phone,
  avatar: user.avatar,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  address: user.address,
  bio: user.bio,
  isEmailVerified: user.isEmailVerified,
  hasPassword: !!user.password,
  oauthProviders: (user.oauthProviders || []).map((p) => ({ provider: p.provider, email: p.email })),
  createdAt: user.createdAt,
});

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, role, phone, dateOfBirth, gender, address, bio } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, 'Email already registered', 409);
  }

  const user = await User.create({
    firstName, lastName, email, password,
    role: role || 'owner',
    phone, dateOfBirth, gender, address, bio,
  });

  const accessToken = tokenService.generateAccessToken(user);
  const { rawToken } = await tokenService.generateRefreshToken(user, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, rawToken);

  return sendSuccess(res, 'Registration successful', {
    user: formatUser(user),
    accessToken,
    expiresIn: config.jwt.expiresIn,
  }, null, 201);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    return sendError(res, 'Invalid email or password', 401);
  }

  if (user.isLocked) {
    return sendError(res, 'Account temporarily locked. Try again later.', 423);
  }

  if (!user.isActive) {
    return sendError(res, 'Account is deactivated', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    return sendError(res, 'Invalid email or password', 401);
  }

  // Reset login attempts and update last login in a single operation
  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );

  const accessToken = tokenService.generateAccessToken(user);
  const { rawToken } = await tokenService.generateRefreshToken(user, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, rawToken);

  return sendSuccess(res, 'Login successful', {
    user: formatUser(user),
    accessToken,
    expiresIn: config.jwt.expiresIn,
  });
};

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.userId).select('+password');
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'Profile fetched', { user: formatUser(user) });
};

exports.updateProfile = async (req, res) => {
  const blocked = ['email', 'password', 'role', 'isActive', 'oauthProviders'];
  blocked.forEach((f) => delete req.body[f]);

  const user = await User.findByIdAndUpdate(req.user.userId, req.body, {
    new: true, runValidators: true,
  });
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, 'Profile updated', { user: formatUser(user) });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId).select('+password');
  if (!user) return sendError(res, 'User not found', 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return sendError(res, 'Current password is incorrect', 400);

  user.password = newPassword;
  await user.save();

  // Revoke all existing tokens
  await tokenService.revokeAllUserTokens(user._id);

  // Issue new tokens
  const accessToken = tokenService.generateAccessToken(user);
  const { rawToken } = await tokenService.generateRefreshToken(user, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  setRefreshCookie(res, rawToken);

  return sendSuccess(res, 'Password changed successfully', { accessToken });
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return sendError(res, 'Refresh token required', 401);

  const result = await tokenService.rotateRefreshToken(token, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (!result) {
    clearRefreshCookie(res);
    return sendError(res, 'Invalid or expired refresh token', 401);
  }

  const user = await User.findById(result.userId);
  if (!user || !user.isActive) {
    clearRefreshCookie(res);
    return sendError(res, 'User not found', 401);
  }

  const accessToken = tokenService.generateAccessToken(user);
  setRefreshCookie(res, result.rawToken);

  return sendSuccess(res, 'Token refreshed', {
    user: formatUser(user),
    accessToken,
    expiresIn: config.jwt.expiresIn,
  });
};

exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await tokenService.revokeRefreshToken(token);
  }
  clearRefreshCookie(res);
  return sendSuccess(res, 'Logged out successfully');
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user) {
    return sendSuccess(res, 'If the email exists, a reset link has been sent');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  await emailService.sendPasswordResetEmail(user, resetToken);

  return sendSuccess(res, 'If the email exists, a reset link has been sent');
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    return sendError(res, 'Invalid or expired reset token', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await tokenService.revokeAllUserTokens(user._id);

  return sendSuccess(res, 'Password reset successful. Please login with your new password.');
};
