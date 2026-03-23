const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    scopes: [{ type: String, enum: ['openid', 'profile', 'email', 'offline_access'] }],
    fingerprint: String,
    isUsed: { type: Boolean, default: false },
    isRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    lastUsedAt: Date,
    createdByIp: String,
    userAgent: String,
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, isRevoked: 1 });
refreshTokenSchema.index({ familyId: 1, isRevoked: 1 });

refreshTokenSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

refreshTokenSchema.statics.findByToken = function (rawToken) {
  const hash = this.hashToken(rawToken);
  return this.findOne({ tokenHash: hash, isRevoked: false, expiresAt: { $gt: new Date() } });
};

refreshTokenSchema.statics.revokeFamilyByFamilyId = function (familyId) {
  return this.updateMany({ familyId }, { $set: { isRevoked: true } });
};

refreshTokenSchema.statics.revokeAllForUser = function (userId) {
  return this.updateMany({ user: userId }, { $set: { isRevoked: true } });
};

refreshTokenSchema.statics.getActiveSessions = function (userId) {
  return this.find({ user: userId, isRevoked: false, isUsed: false, expiresAt: { $gt: new Date() } })
    .select('createdByIp userAgent createdAt lastUsedAt')
    .sort('-createdAt');
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
