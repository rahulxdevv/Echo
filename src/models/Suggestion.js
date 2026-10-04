const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  messageId: { type: String, required: true },
  suggestionId: { type: String, required: true },
  authorId: { type: String, required: true },
  suggestion: { type: String, required: true },
  upvotes: [{ type: String }],
  downvotes: [{ type: String }],
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  createdAt: { type: Date, default: Date.now },
});

suggestionSchema.index({ guildId: 1, messageId: 1 });
suggestionSchema.index({ suggestionId: 1 });

module.exports = mongoose.model('Suggestion', suggestionSchema);
