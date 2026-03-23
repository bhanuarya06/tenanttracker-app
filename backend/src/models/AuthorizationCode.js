const mongoose = require('mongoose');
const { Schema } = mongoose;

const authorizationCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  scopes: [{ type: String, enum: ['openid', 'profile', 'email', 'offline_access'] }],
  codeChallenge: { type: String, required: true },
  codeChallengeMethod: { type: String, enum: ['S256'], default: 'S256' },
  nonce: { type: String },
  isUsed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: true });

authorizationCodeSchema.statics.findValidCode = async function (code) {
  return this.findOne({ code, isUsed: false, expiresAt: { $gt: new Date() } });
};

authorizationCodeSchema.methods.markUsed = async function () {
  this.isUsed = true;
  return this.save();
};

module.exports = mongoose.model('AuthorizationCode', authorizationCodeSchema);
