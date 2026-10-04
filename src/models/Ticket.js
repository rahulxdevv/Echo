const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  ticketNumber: { type: Number, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  category: { type: String, default: 'general' },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  claimedBy: { type: String, default: null },
  claimedByName: { type: String, default: null },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  transcript: [
    {
      author: String,
      authorId: String,
      content: String,
      timestamp: Date,
      attachments: [String]
    }
  ],
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  closeReason: { type: String, default: null }
});

ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, channelId: 1 });
ticketSchema.index({ guildId: 1, userId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
