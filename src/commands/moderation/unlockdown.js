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
  name: 'unlockdown',
  description: 'Unlock all channels in the server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Unlock all channels in the server')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unlocking')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(createErrorPayload('You need Administrator permission to use this command.'));
    }

    const reason = args.join(' ') || 'Server lockdown lifted';

    await message.reply(createUnlockdownPayload(message.author, reason));

    const channels = message.guild.channels.cache.filter(c => c.isTextBased());
    let unlocked = 0;

    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.id, {
          SendMessages: null,
        }, { reason });
        unlocked++;
      } catch (error) {
        console.error(`Failed to unlock ${channel.name}:`, error);
      }
    }

    await message.channel.send(createUnlockdownCompletePayload(unlocked, channels.size));
  },

  async executeSlash(interaction, client) {
    const reason = interaction.options.getString('reason') || 'Server lockdown lifted';

    await interaction.reply(createUnlockdownPayload(interaction.user, reason));

    const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
    let unlocked = 0;

    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: null,
        }, { reason });
        unlocked++;
      } catch (error) {
        console.error(`Failed to unlock ${channel.name}:`, error);
      }
    }

    await interaction.followUp(createUnlockdownCompletePayload(unlocked, channels.size));
  }
};

function createUnlockdownPayload(moderator, reason) {
  let unlockdownText = `# ${emojis.mod.unlock} Server Lockdown Lifted\n\n`;
  unlockdownText += `**Moderator:** ${moderator.tag}\n`;
  unlockdownText += `**Reason:** ${reason}\n\n`;
  unlockdownText += `*Unlocking all channels... This may take a moment.*`;

  const textDisplay = new TextDisplayBuilder().setContent(unlockdownText);

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

function createUnlockdownCompletePayload(unlocked, total) {
  let completeText = `# ${emojis.status.success} Unlock Complete\n\n`;
  completeText += `**Channels Unlocked:** ${unlocked}/${total}`;

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
