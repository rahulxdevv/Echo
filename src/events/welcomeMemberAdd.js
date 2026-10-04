const { AttachmentBuilder } = require('discord.js');
const { getWelcomeConfig, replacePlaceholders } = require('../utils/welcome');
const { createWelcomeCard } = require('../utils/welcomeCard');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const config = await getWelcomeConfig(member.guild.id);

      if (!config.enabled) return;

      // Auto role assignment
      if (config.autoRoleEnabled && config.autoRoles.length > 0) {
        try {
          for (const roleId of config.autoRoles) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
              await member.roles.add(role);
            }
          }
        } catch (error) {
          console.error('Auto role error:', error);
        }
      }

      // Send DM if enabled
      if (config.dmEnabled && config.dmMessage) {
        try {
          const dmText = replacePlaceholders(config.dmMessage, member, member.guild);
          await member.send(dmText);
        } catch (error) {
          console.error('DM welcome error:', error);
        }
      }

      // Send welcome card to channel
      if (config.channelId) {
        try {
          const channel = member.guild.channels.cache.get(config.channelId);
          if (!channel) return;

          // Create welcome card with custom canvas
          try {
            const message = replacePlaceholders(config.message, member, member.guild);

            const card = await createWelcomeCard({
              username: member.user.username,
              avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
              message: message,
              backgroundUrl: config.backgroundUrl,
              avatarSize: config.avatarSize,
              avatarX: config.avatarX,
              avatarY: config.avatarY,
              usernameColor: config.usernameColor,
              usernameSize: config.usernameSize,
              usernameY: config.usernameY,
              welcomeTextColor: config.welcomeTextColor,
              welcomeTextSize: config.welcomeTextSize,
              welcomeTextY: config.welcomeTextY,
              messageColor: config.messageColor,
              messageSize: config.messageSize,
              messageY: config.messageY,
              backgroundBlur: config.backgroundBlur,
              overlayDarkness: config.overlayDarkness,
              bottomGradientHeight: config.bottomGradientHeight,
              bottomGradientOpacity: config.bottomGradientOpacity
            });

            const attachment = new AttachmentBuilder(card, { name: `welcome-${member.id}.png` });

            // Send text message with card
            const textMessage = config.mentionUser
              ? replacePlaceholders(config.textMessage, member, member.guild).replace('{user}', `<@${member.user.id}>`)
              : replacePlaceholders(config.textMessage, member, member.guild);

            await channel.send({
              content: textMessage,
              files: [attachment]
            });
          } catch (cardError) {
            console.error('Welcome card generation error:', cardError);

            // Fallback to text-only message if card fails
            const textMessage = config.mentionUser
              ? replacePlaceholders(config.textMessage, member, member.guild).replace('{user}', `<@${member.user.id}>`)
              : replacePlaceholders(config.textMessage, member, member.guild);

            await channel.send(textMessage);
          }
        } catch (error) {
          console.error('Welcome channel error:', error);
        }
      }
    } catch (error) {
      console.error('Welcome system error:', error);
    }
  }
};
