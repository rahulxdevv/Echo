const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Moderation',
  name: 'mute',
  description: 'Mute a member (remove send message permissions)',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for muting')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(createErrorPayload('You need Moderate Members permission to use this command.'));
    }

    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!member) {
      return message.reply(createErrorPayload('Please mention a user to mute.'));
    }

    if (member.id === message.author.id) {
      return message.reply(createErrorPayload('You cannot mute yourself.'));
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply(createErrorPayload('You cannot mute this user due to role hierarchy.'));
    }

    try {
      await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
      await message.reply(createMutePayload(member.user, message.author, reason));
    } catch (error) {
      await message.reply(createErrorPayload(`Failed to mute user: ${error.message}`));
    }
  },

  async executeSlash(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) {
      return interaction.reply(createErrorPayload('User not found in this server.'));
    }

    if (member.id === interaction.user.id) {
      return interaction.reply(createErrorPayload('You cannot mute yourself.'));
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply(createErrorPayload('You cannot mute this user due to role hierarchy.'));
    }

    try {
      await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
      await interaction.reply(createMutePayload(member.user, interaction.user, reason));
    } catch (error) {
      await interaction.reply(createErrorPayload(`Failed to mute user: ${error.message}`));
    }
  }
};

function createMutePayload(user, moderator, reason) {
  let muteText = `# ${emojis.mod.mute} User Muted\n\n`;
  muteText += `**User:** ${user.tag}\n`;
  muteText += `**Moderator:** ${moderator.tag}\n`;
  muteText += `**Reason:** ${reason}\n`;
  muteText += `**Duration:** 28 days (max timeout)`;

  const textDisplay = new TextDisplayBuilder().setContent(muteText);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}

function createErrorPayload(message) {
  const textDisplay = new TextDisplayBuilder().setContent(`${emojis.status.warning} ${message}`);
  const container = new ContainerBuilder().addTextDisplayComponents(textDisplay);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
