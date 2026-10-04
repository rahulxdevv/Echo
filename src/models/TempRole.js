const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

module.exports = mongoose.model('TempRole', tempRoleSchema);
