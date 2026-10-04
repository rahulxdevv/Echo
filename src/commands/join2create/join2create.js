const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const {
  buildComponentsV2Message,
  getJoin2CreateConfig,
  removeActiveChannel,
  updateJoin2CreateConfig
} = require('../../utils/join2create');

module.exports = {
  category: 'Join2Create',
  name: 'join2create',
  description: 'Manage join-to-create temporary voice channels',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('join2create')
    .setDescription('Manage join-to-create temporary voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Enable join-to-create using a voice channel')
        .addChannelOption(option =>
          option
            .setName('join_channel')
            .setDescription('Voice channel users join to create a private VC')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('Category for temporary voice channels')
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addStringOption(option =>
          option
            .setName('name_format')
            .setDescription('Temp VC name. Supports {user} and {display}')
            .setMaxLength(100)
        )
        .addIntegerOption(option =>
          option
            .setName('default_limit')
            .setDescription('Default user limit, 0 for unlimited')
            .setMinValue(0)
            .setMaxValue(99)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable join-to-create')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Show current join-to-create settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rename-format')
        .setDescription('Change the temporary VC name format')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Supports {user} and {display}')
            .setMaxLength(100)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('default-limit')
        .setDescription('Change default temp VC user limit')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('0 for unlimited')
            .setMinValue(0)
            .setMaxValue(99)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('cleanup')
        .setDescription('Remove stale tracked temporary channels')
    ),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return replyError(interaction, 'You need Manage Channels to configure Join2Create.');
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        return this.handleSetup(interaction);
      case 'disable':
        return this.handleDisable(interaction);
      case 'config':
        return this.handleConfig(interaction);
      case 'rename-format':
        return this.handleRenameFormat(interaction);
      case 'default-limit':
        return this.handleDefaultLimit(interaction);
      case 'cleanup':
        return this.handleCleanup(interaction);
      default:
        return replyError(interaction, 'Unknown Join2Create subcommand.');
    }
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return replyError(message, 'You need Manage Channels to configure Join2Create.');
    }

    const action = (args.shift() || 'config').toLowerCase();

    if (action === 'disable') {
      await updateJoin2CreateConfig(message.guild.id, { enabled: false });
      return message.reply(buildComponentsV2Message('**Join2Create Disabled**\n\nTemporary voice creation is now off.'));
    }

    if (action === 'config') {
      const config = await getJoin2CreateConfig(message.guild.id);
      return message.reply(buildComponentsV2Message(formatConfig(config)));
    }

    return message.reply(buildComponentsV2Message('Use slash commands for setup and advanced Join2Create configuration.'));
  },

  async handleSetup(interaction) {
    const joinChannel = interaction.options.getChannel('join_channel');
    const category = interaction.options.getChannel('category');
    const nameFormat = interaction.options.getString('name_format') || "{user}'s VC";
    const defaultLimit = interaction.options.getInteger('default_limit') ?? 0;

    await updateJoin2CreateConfig(interaction.guild.id, {
      enabled: true,
      joinChannelId: joinChannel.id,
      categoryId: category?.id || joinChannel.parentId || null,
      channelNameFormat: nameFormat,
      defaultUserLimit: defaultLimit
    });

    return interaction.reply(buildComponentsV2Message([
        '**Join2Create Enabled**',
        '',
        `Join Channel: ${joinChannel}`,
        `Temp Category: ${category || joinChannel.parent || 'Same category as join channel'}`,
        `Name Format: ${nameFormat}`,
        `Default Limit: ${defaultLimit || 'Unlimited'}`
      ].join('\n'), { ephemeral: true }));
  },

  async handleDisable(interaction) {
    await updateJoin2CreateConfig(interaction.guild.id, { enabled: false });
    return interaction.reply(buildComponentsV2Message('**Join2Create Disabled**\n\nTemporary voice creation is now off.', { ephemeral: true }));
  },

  async handleConfig(interaction) {
    const config = await getJoin2CreateConfig(interaction.guild.id);
    return interaction.reply(buildComponentsV2Message(formatConfig(config), { ephemeral: true }));
  },

  async handleRenameFormat(interaction) {
    const format = interaction.options.getString('format');
    await updateJoin2CreateConfig(interaction.guild.id, { channelNameFormat: format });
    return interaction.reply(buildComponentsV2Message(`Join2Create name format set to: ${format}`, { ephemeral: true }));
  },

  async handleDefaultLimit(interaction) {
    const limit = interaction.options.getInteger('limit');
    await updateJoin2CreateConfig(interaction.guild.id, { defaultUserLimit: limit });
    return interaction.reply(buildComponentsV2Message(`Join2Create default user limit set to: ${limit || 'Unlimited'}.`, { ephemeral: true }));
  },

  async handleCleanup(interaction) {
    const config = await getJoin2CreateConfig(interaction.guild.id);
    let removed = 0;

    for (const active of [...config.activeChannels]) {
      const channel = await interaction.guild.channels.fetch(active.channelId).catch(() => null);
      if (!channel) {
        await removeActiveChannel(interaction.guild.id, active.channelId);
        removed += 1;
      }
    }

    return interaction.reply(buildComponentsV2Message(
      `Join2Create cleanup complete. Removed ${removed} stale channel record(s).`,
      { ephemeral: true }
    ));
  }
};

function formatConfig(config) {
  return [
    '# Join2Create Config',
    '',
    `Enabled: ${config.enabled ? 'Yes' : 'No'}`,
    `Join Channel: ${config.joinChannelId ? `<#${config.joinChannelId}>` : 'Not set'}`,
    `Temp Category: ${config.categoryId ? `<#${config.categoryId}>` : 'Same as join channel'}`,
    `Name Format: ${config.channelNameFormat}`,
    `Default Limit: ${config.defaultUserLimit || 'Unlimited'}`,
    `Active Temp VCs: ${config.activeChannels.length}`
  ].join('\n');
}
