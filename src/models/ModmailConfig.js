const mongoose = require('mongoose');

const modmailConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  categoryId: { type: String, required: true },
  logChannelId: { type: String, required: true },
  roleId: { type: String, required: true }, // Staff role
  enabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('ModmailConfig', modmailConfigSchema);
