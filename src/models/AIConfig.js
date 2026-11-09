const mongoose = require('mongoose');

const aiConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  enabled: { type: Boolean, default: true },
  // BYO (bring-your-own) OpenAI-compatible provider set by the server owner.
  baseUrl: { type: String, default: null },
  apiKey: { type: String, default: null },
  model: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('AIConfig', aiConfigSchema);
