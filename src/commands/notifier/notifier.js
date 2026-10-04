const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder
} = require('discord.js');
const NotifierConfig = require('../../models/NotifierConfig');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Notifier',
  name: 'notifier',
  description: 'Manage YouTube and Twitch notifications',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('notifier')
    .setDescription('Manage YouTube and Twitch notifications')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new notification tracker')
        .addStringOption(option =>
          option.setName('platform').setDescription('Platform to track').setRequired(true).addChoices(
            { name: 'YouTube', value: 'youtube' },
            { name: 'Twitch', value: 'twitch' }
          )
        )
        .addStringOption(option =>
          option.setName('creator').setDescription('YouTube Channel ID or Twitch Username').setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('channel').setDescription('Channel to post alerts').addChannelTypes(0).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message').setDescription('Custom message. Uses {creator}, {title}, {link}').setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a notification tracker')
        .addStringOption(option =>
          option.setName('platform').setDescription('Platform to track').setRequired(true).addChoices(
            { name: 'YouTube', value: 'youtube' },
            { name: 'Twitch', value: 'twitch' }
          )
        )
        .addStringOption(option =>
          option.setName('creator').setDescription('YouTube Channel ID or Twitch Username').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all active notification trackers')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'add') {
        const platform = interaction.options.getString('platform');
        const creatorId = interaction.options.getString('creator');
        const channel = interaction.options.getChannel('channel');
        const customMessage = interaction.options.getString('message');

        const existing = await NotifierConfig.findOne({ guildId: interaction.guild.id, platform, creatorId });
        if (existing) {
          return replyError(interaction, `A tracker for this ${platform} creator already exists in this server.`);
        }

        const newTracker = new NotifierConfig({
          guildId: interaction.guild.id,
          platform,
          creatorId,
          channelId: channel.id
        });

        if (customMessage) newTracker.message = customMessage;
        
        await newTracker.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Tracker Added**\n\nSuccessfully added **${platform}** tracker for \`${creatorId}\`.\nAlerts will be sent to ${channel}.`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'remove') {
        const platform = interaction.options.getString('platform');
        const creatorId = interaction.options.getString('creator');

        const result = await NotifierConfig.findOneAndDelete({ guildId: interaction.guild.id, platform, creatorId });
        if (result) {
          const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`✅ **Tracker Removed**\n\nSuccessfully removed **${platform}** tracker for \`${creatorId}\`.`)
          );
          return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } else {
          return replyError(interaction, 'Tracker not found.');
        }

      } else if (subcommand === 'list') {
        const trackers = await NotifierConfig.find({ guildId: interaction.guild.id });
        if (trackers.length === 0) {
          const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Content Trackers**\n\nThere are no active trackers in this server.`)
          );
          return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

        const lines = trackers.map((t, idx) => {
          return `${idx + 1}. **${t.platform.toUpperCase()}**: \`${t.creatorId}\` -> <#${t.channelId}>`;
        });

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Active Content Trackers**\n\n${lines.join('\n')}`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    } catch (error) {
      console.error('Notifier command error:', error);
      await replyError(interaction, 'An error occurred while managing content trackers.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permissions to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    try {
      if (subcommand === 'add') {
        const platform = args[1]?.toLowerCase();
        const creatorId = args[2];
        const channel = message.mentions.channels.first();
        const customMessage = args.slice(4).join(' ');

        if (!platform || !creatorId || !channel || !['youtube', 'twitch'].includes(platform)) {
          return replyError(message, 'Usage: `notifier add <youtube|twitch> <creator_id> #channel [custom_message]`');
        }

        const existing = await NotifierConfig.findOne({ guildId: message.guild.id, platform, creatorId });
        if (existing) return replyError(message, `A tracker for this ${platform} creator already exists.`);

        const newTracker = new NotifierConfig({
          guildId: message.guild.id,
          platform,
          creatorId,
          channelId: channel.id
        });

        if (customMessage) newTracker.message = customMessage;
        
        await newTracker.save();
        return message.reply(`✅ Successfully added **${platform}** tracker for \`${creatorId}\`. Alerts sent to ${channel}.`);

      } else if (subcommand === 'remove') {
        const platform = args[1]?.toLowerCase();
        const creatorId = args[2];

        if (!platform || !creatorId) return replyError(message, 'Usage: `notifier remove <youtube|twitch> <creator_id>`');

        const result = await NotifierConfig.findOneAndDelete({ guildId: message.guild.id, platform, creatorId });
        if (result) {
          return message.reply(`✅ Successfully removed **${platform}** tracker for \`${creatorId}\`.`);
        } else {
          return replyError(message, 'Tracker not found.');
        }

      } else if (subcommand === 'list') {
        const trackers = await NotifierConfig.find({ guildId: message.guild.id });
        if (trackers.length === 0) return message.reply('No active trackers.');

        const lines = trackers.map((t, idx) => `${idx + 1}. **${t.platform.toUpperCase()}**: \`${t.creatorId}\` -> <#${t.channelId}>`);
        return message.reply(`**Active Content Trackers**\n\n${lines.join('\n')}`);
      } else {
        return replyError(message, 'Available subcommands: `add`, `remove`, `list`');
      }
    } catch (error) {
      console.error('Notifier command error:', error);
      await replyError(message, 'An error occurred while managing content trackers.');
    }
  }
};
