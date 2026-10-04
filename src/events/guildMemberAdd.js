const { Events } = require('discord.js');
const { cacheGuildInvites, recordInvite, findUsedInvite, getCachedInvites } = require('../utils/invites');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const guild = member.guild;
      const cachedInvites = await getCachedInvites(guild.id);

      const usedInvite = await findUsedInvite(guild, cachedInvites);

      await cacheGuildInvites(guild);

      const accountAge = Date.now() - member.user.createdTimestamp;
      const minAccountAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const isFake = accountAge < minAccountAge;

      if (usedInvite && usedInvite.inviterId) {
        const inviter = usedInvite.inviter || await member.client.users.fetch(usedInvite.inviterId).catch(() => null);

        await recordInvite(
          guild.id,
          usedInvite.inviterId,
          inviter ? inviter.tag : 'Unknown',
          member.user.id,
          member.user.tag,
          usedInvite.code,
          isFake
        );

        console.log(`[Invite Tracker] ${member.user.tag} joined using invite ${usedInvite.code} from ${inviter ? inviter.tag : 'Unknown'}${isFake ? ' (FAKE - Account too new)' : ''}`);
      } else {
        await recordInvite(
          guild.id,
          'unknown',
          'Unknown',
          member.user.id,
          member.user.tag,
          'unknown',
          isFake
        );

        console.log(`[Invite Tracker] ${member.user.tag} joined but invite could not be determined${isFake ? ' (FAKE - Account too new)' : ''}`);
      }

    } catch (error) {
      console.error('Error tracking invite on member join:', error);
    }
  }
};
