const { Events } = require('discord.js');
const { cacheGuildInvites } = require('../utils/invites');

module.exports = {
  name: Events.InviteDelete,
  async execute(invite) {
    try {
      await cacheGuildInvites(invite.guild);
      console.log(`[Invite Tracker] Invite deleted: ${invite.code}`);
    } catch (error) {
      console.error('Error caching invite on delete:', error);
    }
  }
};
