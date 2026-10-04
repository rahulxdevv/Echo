const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder
} = require('discord.js');
const { updateSuggestionConfig, getSuggestionConfig } = require('../../utils/suggestion');
const Suggestion = require('../../models/Suggestion');
const { createSuggestionCard } = require('../../utils/suggestionCard');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Suggestion',
  name: 'suggestion',
  description: 'Configure and manage the suggestion system',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Configure and manage the suggestion system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set the channel for suggestions')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel to post suggestions in')
            .addChannelTypes(0) // GuildText
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the suggestion system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Whether the system should be enabled')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('manage')
        .setDescription('Manage a suggestion (Approve/Reject)')
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('The suggestion ID')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Approve', value: 'approved' },
              { name: 'Reject', value: 'rejected' }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel');
        await updateSuggestionConfig(interaction.guild.id, {
          channelId: channel.id,
          enabled: true
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Suggestion System Configured**\n\nChannel set to ${channel} and system enabled.`)
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      } else if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        await updateSuggestionConfig(interaction.guild.id, { enabled });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Suggestion System**\n\nThe system is now ${enabled ? 'enabled' : 'disabled'}.`)
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      } else if (subcommand === 'manage') {
        const suggestionId = interaction.options.getString('id');
        const status = interaction.options.getString('action');

        const config = await getSuggestionConfig(interaction.guild.id);
        if (!config.enabled || !config.channelId) {
          return replyError(interaction, 'Suggestion system is not configured.');
        }

        const suggestion = await Suggestion.findOne({ guildId: interaction.guild.id, suggestionId });
        if (!suggestion) {
          return replyError(interaction, 'Suggestion not found.');
        }

        suggestion.status = status;
        await suggestion.save();

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (channel) {
          try {
            const message = await channel.messages.fetch(suggestion.messageId);
            if (message) {
              const author = await client.users.fetch(suggestion.authorId).catch(() => null);
              const username = author ? author.username : 'Unknown User';
              const avatarUrl = author ? author.displayAvatarURL({ extension: 'png', size: 256 }) : client.user.displayAvatarURL();

              const updatedCardBuffer = await createSuggestionCard({
                username,
                avatarUrl,
                suggestionText: suggestion.suggestion,
                suggestionId: suggestion.suggestionId,
                upvotes: suggestion.upvotes.length,
                downvotes: suggestion.downvotes.length,
                status: suggestion.status
              });

              await message.edit({
                files: [{
                  attachment: updatedCardBuffer,
                  name: 'suggestion.png'
                }],
                components: []
              });
            }
          } catch (msgErr) {
            console.error('Could not edit suggestion message:', msgErr);
          }
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Suggestion Updated**\n\nSuggestion \`#${suggestionId}\` has been marked as **${status}**.`)
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }
    } catch (error) {
      console.error('Suggestion command error:', error);
      await replyError(interaction, 'An error occurred while running the suggestion command.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permissions to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    try {
      if (subcommand === 'setup') {
        const channel = message.mentions.channels.first();
        if (!channel) return replyError(message, 'Please mention a channel.');

        await updateSuggestionConfig(message.guild.id, {
          channelId: channel.id,
          enabled: true
        });

        return message.reply(`Suggestion system configured to use ${channel} and enabled.`);
      } else if (subcommand === 'toggle') {
        const enabled = args[1]?.toLowerCase() === 'true' || args[1]?.toLowerCase() === 'on';
        await updateSuggestionConfig(message.guild.id, { enabled });
        return message.reply(`Suggestion system is now ${enabled ? 'enabled' : 'disabled'}.`);
      } else if (subcommand === 'manage') {
        const suggestionId = args[1];
        const status = args[2]?.toLowerCase();

        if (!suggestionId || !['approved', 'rejected'].includes(status)) {
          return replyError(message, 'Usage: `suggestion manage <id> <approved|rejected>`');
        }

        const config = await getSuggestionConfig(message.guild.id);
        if (!config.enabled || !config.channelId) {
          return replyError(message, 'Suggestion system is not configured.');
        }

        const suggestion = await Suggestion.findOne({ guildId: message.guild.id, suggestionId });
        if (!suggestion) {
          return replyError(message, 'Suggestion not found.');
        }

        suggestion.status = status;
        await suggestion.save();

        const channel = message.guild.channels.cache.get(config.channelId);
        if (channel) {
          try {
            const fetchedMsg = await channel.messages.fetch(suggestion.messageId);
            if (fetchedMsg) {
              const author = await client.users.fetch(suggestion.authorId).catch(() => null);
              const username = author ? author.username : 'Unknown User';
              const avatarUrl = author ? author.displayAvatarURL({ extension: 'png', size: 256 }) : client.user.displayAvatarURL();

              const updatedCardBuffer = await createSuggestionCard({
                username,
                avatarUrl,
                suggestionText: suggestion.suggestion,
                suggestionId: suggestion.suggestionId,
                upvotes: suggestion.upvotes.length,
                downvotes: suggestion.downvotes.length,
                status: suggestion.status
              });

              await fetchedMsg.edit({
                files: [{
                  attachment: updatedCardBuffer,
                  name: 'suggestion.png'
                }],
                components: []
              });
            }
          } catch (msgErr) {
            console.error('Could not edit suggestion message:', msgErr);
          }
        }

        return message.reply(`Suggestion \`#${suggestionId}\` has been marked as **${status}**.`);
      } else {
        return replyError(message, 'Invalid subcommand. Use `setup #channel`, `toggle true/false`, or `manage <id> <approved|rejected>`.');
      }
    } catch (error) {
      console.error('Suggestion command error:', error);
      await replyError(message, 'An error occurred while running the suggestion command.');
    }
  }
};
