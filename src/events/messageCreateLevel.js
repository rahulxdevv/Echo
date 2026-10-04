const { getLevelConfig, getUserLevel, addXp, calculateXpMultiplier, isOnCooldown, applyLevelRewards, replaceLevelPlaceholders } = require('../utils/levelling');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore bots and system messages
    if (message.author.bot || !message.guild) return;

    try {
      const config = await getLevelConfig(message.guild.id);

      // Check if levelling is enabled
      if (!config.enabled) return;

      // Check if channel is ignored
      if (config.ignoredChannels.includes(message.channel.id)) return;

      // Check if user has ignored role
      if (config.ignoredRoles.some(roleId => message.member.roles.cache.has(roleId))) return;

      // Check if XP is limited to specific channels
      if (config.xpChannels.length > 0 && !config.xpChannels.includes(message.channel.id)) return;

      // Get user level data
      const userLevel = await getUserLevel(message.guild.id, message.author.id);

      // Check cooldown
      if (isOnCooldown(userLevel.lastMessageXp, config.messageXpCooldown)) return;

      // Calculate XP amount
      const baseXp = Math.floor(Math.random() * (config.messageXpMax - config.messageXpMin + 1)) + config.messageXpMin;
      const multiplier = calculateXpMultiplier(message.member, config);
      const xpAmount = Math.floor(baseXp * multiplier);

      // Update message count
      userLevel.messageCount += 1;
      userLevel.lastMessageXp = new Date();
      await userLevel.save();

      // Add XP and check for level up
      const result = await addXp(message.guild.id, message.author.id, xpAmount, config);

      // Handle level up
      if (result.leveledUp) {
        // Apply level rewards
        const { addedRoles } = await applyLevelRewards(message.member, result.newLevel, config);

        // Send level up announcement
        const announceMessage = replaceLevelPlaceholders(
          config.announceMessage,
          message.member,
          result.newLevel,
          result.userLevel.totalXp
        );

        // Add reward info to message
        let fullMessage = announceMessage;
        if (addedRoles.length > 0) {
          fullMessage += `\n🎁 **Rewards:** ${addedRoles.map(r => r.toString()).join(', ')}`;
        }

        // Send to announce channel or same channel
        if (config.announceChannel) {
          const announceChannelObj = message.guild.channels.cache.get(config.announceChannel);
          if (announceChannelObj) {
            await announceChannelObj.send(fullMessage);
          }
        } else {
          await message.channel.send(fullMessage);
        }

        // Send DM if enabled
        if (config.announceDM) {
          try {
            await message.author.send(fullMessage);
          } catch (error) {
            console.error('Failed to send level up DM:', error);
          }
        }
      }
    } catch (error) {
      console.error('Message XP error:', error);
    }
  }
};
