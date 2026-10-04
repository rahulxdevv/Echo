const BoosterConfig = require('../models/BoosterConfig');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    if (oldMember.user.bot) return;

    // Check if the user just started boosting
    const justBoosted = !oldMember.premiumSince && newMember.premiumSince;
    if (!justBoosted) return;

    try {
      const config = await BoosterConfig.findOne({ guildId: newMember.guild.id });
      if (!config || !config.enabled || !config.channelId) return;

      const channel = newMember.guild.channels.cache.get(config.channelId);
      if (!channel) return;

      let msgText = config.message
        .replace(/{user}/g, `<@${newMember.id}>`)
        .replace(/{server}/g, `**${newMember.guild.name}**`);

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(msgText)
      );

      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

    } catch (error) {
      console.error('Error sending booster notification:', error);
    }
  }
};
