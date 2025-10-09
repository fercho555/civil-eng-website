const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expires: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: Date,
  replacedByToken: String,
  revokedByIp: String,
  createdByIp: String
});

// Virtual property to check if token is expired
RefreshTokenSchema.virtual('isExpired').get(function() {
  return Date.now() >= this.expires;
});

// Virtual to check if token is active
RefreshTokenSchema.virtual('isActive').get(function() {
  return !this.revokedAt && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);