const mongoose = require('mongoose');

const premiumCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  plan: { type: String, default: 'monthly' }, // monthly, yearly, lifetime
  expiresAt: { type: Date },
  redeemedBy: { type: String }, // User ID
  redeemedAt: { type: Date },
  status: { type: String, default: 'active' } // active, redeemed, expired
});

module.exports = mongoose.model('PremiumCode', premiumCodeSchema);
