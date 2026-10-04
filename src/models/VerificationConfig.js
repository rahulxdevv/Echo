const mongoose = require('mongoose');

const verificationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, default: null },
  roleId: { type: String, default: null },
  type: { type: String, enum: ['button', 'math', 'captcha'], default: 'button' },
  enabled: { type: Boolean, default: false },
  messageId: { type: String, default: null }, // To keep track of the main verification message
});

module.exports = mongoose.model('VerificationConfig', verificationConfigSchema);
