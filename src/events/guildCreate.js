const { Events, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { cacheGuildInvites } = require('../utils/invites');
const { log } = require('../utils/logger');
const emojis = require('../utils/emojis');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    try {
      log('Bot', `Joined new guild: ${guild.name} (${guild.id})`);
      await cacheGuildInvites(guild);
      
      const logChannelId = process.env.GUILD_LOG_CHANNEL_ID;
      if (logChannelId) {
        const channel = guild.client.channels.cache.get(logChannelId);
        if (channel) {
          const content = [
            `# ${emojis.common.plus} Joined New Server\n`,
            `**Name:** ${guild.name}`,
            `**ID:** ${guild.id}`,
            `**Members:** ${guild.memberCount}`,
            `**Owner:** <@${guild.ownerId}> (${guild.ownerId})`
          ].join('\n');

          const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
          await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }
      }
    } catch (error) {
      log('Error', `Error in guildCreate event: ${error.message}`);
    }
  }
};
