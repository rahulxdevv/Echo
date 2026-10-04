const mongoose = require('mongoose');

const ticketConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Panel settings
  panelChannelId: { type: String, default: null },
  panelMessageId: { type: String, default: null },
  panelTitle: { type: String, default: 'Support Tickets' },
  panelDescription: { type: String, default: 'Click the button below to create a support ticket.' },
  panelThumbnail: { type: String, default: null },
  panelImage: { type: String, default: null },

  // Button customization
  buttonLabel: { type: String, default: 'Create Ticket' },
  buttonEmoji: { type: String, default: '🎫' },
  buttonStyle: { type: String, enum: ['Primary', 'Secondary', 'Success', 'Danger'], default: 'Primary' },

  // Ticket settings
  categoryId: { type: String, default: null },
  closeCategoryId: { type: String, default: null },
  ticketCounter: { type: Number, default: 0 },
  ticketNameFormat: { type: String, default: 'ticket-{number}' },
  maxTicketsPerUser: { type: Number, default: 3 },

  // Categories
  categories: [
    {
      id: String,
      name: String,
      description: String,
      emoji: String,
      buttonStyle: { type: String, default: 'Primary' },
      staffRoles: [String]
    }
  ],

  // Staff roles
  staffRoles: [{ type: String }],
  adminRoles: [{ type: String }],

  // Logging
  logChannelId: { type: String, default: null },
  transcriptChannelId: { type: String, default: null },

  // Auto-close
  autoCloseEnabled: { type: Boolean, default: false },
  autoCloseTime: { type: Number, default: 86400000 }, // 24 hours

  // Welcome message
  welcomeMessage: { type: String, default: 'Thank you for contacting support! A staff member will be with you shortly.' },
  welcomeEmbed: { type: Boolean, default: false },

  // Ping settings
  pingRoles: [{ type: String }],
  pingOnCreate: { type: Boolean, default: true },
  mentionUser: { type: Boolean, default: true },

  // Ticket channel settings
  showClaimButton: { type: Boolean, default: true },
  showCloseButton: { type: Boolean, default: true },
  showTranscriptButton: { type: Boolean, default: true },
  showPriorityButtons: { type: Boolean, default: true },
  closeButtonLabel: { type: String, default: 'Close' },
  claimButtonLabel: { type: String, default: 'Claim' },
  unclaimButtonLabel: { type: String, default: 'Unclaim' },
  transcriptButtonLabel: { type: String, default: 'Transcript' },
  closeButtonEmoji: { type: String, default: '🔒' },
  claimButtonEmoji: { type: String, default: '✋' },
  unclaimButtonEmoji: { type: String, default: '↩️' },

  transcriptButtonEmoji: { type: String, default: '📄' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TicketConfig', ticketConfigSchema);
