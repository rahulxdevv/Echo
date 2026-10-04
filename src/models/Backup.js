const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  guildName: { type: String, required: true },
  guildIcon: { type: String },
  data: { type: String, required: true }, // Stringified JSON
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Backup', backupSchema);
