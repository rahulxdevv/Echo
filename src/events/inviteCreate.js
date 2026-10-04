const { Events } = require('discord.js');
const { cacheGuildInvites } = require('../utils/invites');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    try {
      await cacheGuildInvites(invite.guild);
      console.log(`[Invite Tracker] New invite created: ${invite.code} by ${invite.inviter?.tag || 'Unknown'}`);
    } catch (error) {
      console.error('Error caching invite on create:', error);
    }
  }
};
