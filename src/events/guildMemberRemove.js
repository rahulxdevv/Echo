const { Events } = require('discord.js');
const { markInviteAsLeft } = require('../utils/invites');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      const invite = await markInviteAsLeft(member.guild.id, member.user.id);

      if (invite) {
        console.log(`[Invite Tracker] ${member.user.tag} left the server. Invite from ${invite.inviterTag} marked as left.`);
      } else {
        console.log(`[Invite Tracker] ${member.user.tag} left the server but no invite record found.`);
      }

    } catch (error) {
      console.error('Error tracking member leave:', error);
    }
  }
};
