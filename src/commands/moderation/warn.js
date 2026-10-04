const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/Warning');
const { replyError, replyNotice } = require('../../utils/respond');

async function createWarning(guildId, userId, moderatorId, reason) {
  return Warning.create({
    guildId,
    userId,
    moderatorId,
    reason,
  });
}

async function notifyUser(user, guildName, moderatorTag, reason) {
  try {
    await user.send({
      content: `You have been warned in ${guildName}\n**Reason:** ${reason}\n**Moderator:** ${moderatorTag}`,
    });
  } catch (error) {}
}

module.exports = {
  category: 'Moderation',
  name: 'warn',
  description: 'Warn a user',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('The reason for the warning')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return replyError(message, 'You do not have permission to warn members.');
    }

    const user = message.mentions.users.first();
    if (!user) {
      return replyError(message, 'Mention a member you want to warn.');
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await createWarning(message.guild.id, user.id, message.author.id, reason);
      await replyNotice(message, `Warning saved for ${user.tag}. Reason: ${reason}`);
      await notifyUser(user, message.guild.name, message.author.tag, reason);
    } catch (error) {
      console.error('Warn error:', error);
      await replyError(message, 'I could not save that warning.');
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await createWarning(interaction.guild.id, user.id, interaction.user.id, reason);
      await replyNotice(interaction, `Warning saved for ${user.tag}. Reason: ${reason}`);
      await notifyUser(user, interaction.guild.name, interaction.user.tag, reason);
    } catch (error) {
      console.error('Warn error:', error);
      await replyError(interaction, 'I could not save that warning.');
    }
  },
};


