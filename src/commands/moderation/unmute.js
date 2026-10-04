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
  name: 'unmute',
  description: 'Unmute a member',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unmuting')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply(createErrorPayload('You need Moderate Members permission to use this command.'));
    }

    const member = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!member) {
      return message.reply(createErrorPayload('Please mention a user to unmute.'));
    }

    if (!member.isCommunicationDisabled()) {
      return message.reply(createErrorPayload('This user is not muted.'));
    }

    try {
      await member.timeout(null, reason);
      await message.reply(createUnmutePayload(member.user, message.author, reason));
    } catch (error) {
      await message.reply(createErrorPayload(`Failed to unmute user: ${error.message}`));
    }
  },

  async executeSlash(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) {
      return interaction.reply(createErrorPayload('User not found in this server.'));
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply(createErrorPayload('This user is not muted.'));
    }

    try {
      await member.timeout(null, reason);
      await interaction.reply(createUnmutePayload(member.user, interaction.user, reason));
    } catch (error) {
      await interaction.reply(createErrorPayload(`Failed to unmute user: ${error.message}`));
    }
  }
};

function createUnmutePayload(user, moderator, reason) {
  let unmuteText = `# ${emojis.mod.unmute} User Unmuted\n\n`;
  unmuteText += `**User:** ${user.tag}\n`;
  unmuteText += `**Moderator:** ${moderator.tag}\n`;
  unmuteText += `**Reason:** ${reason}`;

  const textDisplay = new TextDisplayBuilder().setContent(unmuteText);

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
