const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder
} = require('discord.js');
const { getSuggestionConfig, createSuggestionRecord } = require('../../utils/suggestion');
const { createSuggestionCard } = require('../../utils/suggestionCard');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Suggestion',
  name: 'suggest',
  description: 'Submit a suggestion for the server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server')
    .addStringOption(option =>
      option
        .setName('suggestion')
        .setDescription('The suggestion you want to submit')
        .setRequired(true)
    ),

  async executeSlash(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getSuggestionConfig(interaction.guild.id);

      if (!config.enabled || !config.channelId) {
        return replyError(interaction, 'The suggestion system is currently disabled or not configured.');
      }

      const suggestionChannel = interaction.guild.channels.cache.get(config.channelId);
      if (!suggestionChannel) {
        return replyError(interaction, 'The configured suggestion channel could not be found.');
      }

      const suggestionText = interaction.options.getString('suggestion');
      const user = interaction.user;

      // Temporary ID before saving to get the card
      const tempId = 'PENDING';
      
      const cardBuffer = await createSuggestionCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        suggestionText,
        suggestionId: tempId,
        upvotes: 0,
        downvotes: 0,
        status: 'pending'
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('suggestion_upvote')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
        );

      const suggestionMessage = await suggestionChannel.send({
        files: [{
          attachment: cardBuffer,
          name: 'suggestion.png'
        }],
        components: [row]
      });

      // Now save and update card with real ID
      const record = await createSuggestionRecord(
        interaction.guild.id,
        suggestionMessage.id,
        user.id,
        suggestionText
      );

      // Re-generate card with real ID
      const updatedCardBuffer = await createSuggestionCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        suggestionText,
        suggestionId: record.suggestionId,
        upvotes: 0,
        downvotes: 0,
        status: 'pending'
      });

      await suggestionMessage.edit({
        files: [{
          attachment: updatedCardBuffer,
          name: 'suggestion.png'
        }]
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Suggestion Submitted**\n\nYour suggestion has been posted in ${suggestionChannel}.`)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

    } catch (error) {
      console.error('Suggest command error:', error);
      await replyError(interaction, 'Failed to submit suggestion.');
    }
  },

  async executePrefix(message, args, client) {
    try {
      const config = await getSuggestionConfig(message.guild.id);

      if (!config.enabled || !config.channelId) {
        return replyError(message, 'The suggestion system is currently disabled or not configured.');
      }

      const suggestionChannel = message.guild.channels.cache.get(config.channelId);
      if (!suggestionChannel) {
        return replyError(message, 'The configured suggestion channel could not be found.');
      }

      const suggestionText = args.join(' ');
      if (!suggestionText) {
        return replyError(message, 'Please provide a suggestion.');
      }

      const user = message.author;
      const tempId = 'PENDING';
      
      const cardBuffer = await createSuggestionCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        suggestionText,
        suggestionId: tempId,
        upvotes: 0,
        downvotes: 0,
        status: 'pending'
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('suggestion_upvote')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
        );

      const suggestionMessage = await suggestionChannel.send({
        files: [{
          attachment: cardBuffer,
          name: 'suggestion.png'
        }],
        components: [row]
      });

      const record = await createSuggestionRecord(
        message.guild.id,
        suggestionMessage.id,
        user.id,
        suggestionText
      );

      const updatedCardBuffer = await createSuggestionCard({
        username: user.username,
        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 256 }),
        suggestionText,
        suggestionId: record.suggestionId,
        upvotes: 0,
        downvotes: 0,
        status: 'pending'
      });

      await suggestionMessage.edit({
        files: [{
          attachment: updatedCardBuffer,
          name: 'suggestion.png'
        }]
      });

      await message.reply(`Your suggestion has been submitted to ${suggestionChannel}.`);
      
    } catch (error) {
      console.error('Suggest command error:', error);
      await replyError(message, 'Failed to submit suggestion.');
    }
  }
};
