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
  name: 'lockdown',
  description: 'Lock all channels in the server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock all channels in the server')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for lockdown')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(createErrorPayload('You need Administrator permission to use this command.'));
    }

    const reason = args.join(' ') || 'Server lockdown initiated';

    await message.reply(createLockdownPayload(message.author, reason, true));

    const channels = message.guild.channels.cache.filter(c => c.isTextBased());
    let locked = 0;

    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.id, {
          SendMessages: false,
        }, { reason });
        locked++;
      } catch (error) {
        console.error(`Failed to lock ${channel.name}:`, error);
      }
    }

    await message.channel.send(createLockdownCompletePayload(locked, channels.size));
  },

  async executeSlash(interaction, client) {
    const reason = interaction.options.getString('reason') || 'Server lockdown initiated';

    await interaction.reply(createLockdownPayload(interaction.user, reason, true));

    const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
    let locked = 0;

    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false,
        }, { reason });
        locked++;
      } catch (error) {
        console.error(`Failed to lock ${channel.name}:`, error);
      }
    }

    await interaction.followUp(createLockdownCompletePayload(locked, channels.size));
  }
};

function createLockdownPayload(moderator, reason, isLocking) {
  let lockdownText = `# ${emojis.mod.lock} Server Lockdown Initiated\n\n`;
  lockdownText += `**Moderator:** ${moderator.tag}\n`;
  lockdownText += `**Reason:** ${reason}\n\n`;
  lockdownText += `*Locking all channels... This may take a moment.*`;

  const textDisplay = new TextDisplayBuilder().setContent(lockdownText);

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

function createLockdownCompletePayload(locked, total) {
  let completeText = `# ${emojis.status.success} Lockdown Complete\n\n`;
  completeText += `**Channels Locked:** ${locked}/${total}`;

  const textDisplay = new TextDisplayBuilder().setContent(completeText);

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
