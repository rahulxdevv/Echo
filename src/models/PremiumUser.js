const mongoose = require('mongoose');

const premiumUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  plan: { type: String, required: true },
  expiresAt: { type: Date },
  redeemedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PremiumUser', premiumUserSchema);
