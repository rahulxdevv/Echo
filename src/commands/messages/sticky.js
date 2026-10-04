const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getStickyMessage,
  createStickyMessage,
  updateStickyMessage,
  deleteStickyMessage,
  toggleStickyMessage,
  getAllStickyMessages
} = require('../../utils/sticky');
const { replyWithCard, replyError } = require('../../utils/respond');

module.exports = {
  category: 'Messages',
  name: 'sticky',
  description: 'Manage sticky messages that stay at the bottom of channels',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages that stay at the bottom of channels')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a sticky message in a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to set the sticky message in')
            .addChannelTypes(0) // GuildText
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The message to stick')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update an existing sticky message')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel with the sticky message')
            .addChannelTypes(0) // GuildText
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The new message content')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a sticky message from a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to remove the sticky message from')
            .addChannelTypes(0) // GuildText
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable a sticky message')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel with the sticky message')
            .addChannelTypes(0) // GuildText
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all sticky messages in the server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a sticky message configuration')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to view')
            .addChannelTypes(0) // GuildText
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(message, 'You need Administrator permission to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      return replyError(message, 'Please specify a subcommand: set, update, remove, toggle, list, view');
    }

    switch (subcommand) {
      case 'set':
      case 'create':
        return this.handleSet(message, args.slice(1), client, true);

      case 'update':
      case 'edit':
        return this.handleUpdate(message, args.slice(1), client, true);

      case 'remove':
      case 'delete':
        return this.handleRemove(message, args.slice(1), client, true);

      case 'toggle':
      case 'enable':
      case 'disable':
        return this.handleToggle(message, args.slice(1), client, true);

      case 'list':
      case 'all':
        return this.handleList(message, args.slice(1), client, true);

      case 'view':
      case 'info':
        return this.handleView(message, args.slice(1), client, true);

      default:
        return replyError(message, 'Unknown subcommand. Available: set, update, remove, toggle, list, view');
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        return this.handleSet(interaction, [], client, false);
      case 'update':
        return this.handleUpdate(interaction, [], client, false);
      case 'remove':
        return this.handleRemove(interaction, [], client, false);
      case 'toggle':
        return this.handleToggle(interaction, [], client, false);
      case 'list':
        return this.handleList(interaction, [], client, false);
      case 'view':
        return this.handleView(interaction, [], client, false);
    }
  },

  async handleSet(target, args, client, isPrefix) {
    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    const message = isPrefix
      ? args.slice(1).join(' ')
      : target.options.getString('message');

    if (!message || message.trim().length === 0) {
      return replyError(target, 'Please provide a message to stick.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const createdBy = isPrefix ? target.author.id : target.user.id;
      const result = await createStickyMessage(guildId, channel.id, message, createdBy);

      if (!result.success) {
        return replyError(target, result.message);
      }

      // Send the initial sticky message
      const sentMessage = await channel.send(message);
      await require('../../utils/sticky').updateLastMessageId(channel.id, sentMessage.id);

      const embed = {
        color: 0x5865F2,
        title: '📌 Sticky Message Set',
        description: `Successfully set a sticky message in ${channel}`,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Status', value: 'Enabled', inline: true },
          { name: 'Message', value: message.substring(0, 1000), inline: false }
        ],
        footer: { text: `Set by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Set sticky message error:', error);
      await replyError(target, 'There was an error setting the sticky message.');
    }
  },

  async handleUpdate(target, args, client, isPrefix) {
    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    const message = isPrefix
      ? args.slice(1).join(' ')
      : target.options.getString('message');

    if (!message || message.trim().length === 0) {
      return replyError(target, 'Please provide a message.');
    }

    try {
      const result = await updateStickyMessage(channel.id, message);

      if (!result.success) {
        return replyError(target, result.message);
      }

      // Delete old sticky message and send new one
      const sticky = result.sticky;
      if (sticky.lastMessageId) {
        try {
          const oldMessage = await channel.messages.fetch(sticky.lastMessageId);
          await oldMessage.delete();
        } catch (err) {
          console.error('Failed to delete old sticky message:', err);
        }
      }

      if (sticky.enabled) {
        const sentMessage = await channel.send(message);
        await require('../../utils/sticky').updateLastMessageId(channel.id, sentMessage.id);
      }

      const embed = {
        color: 0x5865F2,
        title: '📝 Sticky Message Updated',
        description: `Successfully updated the sticky message in ${channel}`,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Status', value: sticky.enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'New Message', value: message.substring(0, 1000), inline: false }
        ],
        footer: { text: `Updated by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Update sticky message error:', error);
      await replyError(target, 'There was an error updating the sticky message.');
    }
  },

  async handleRemove(target, args, client, isPrefix) {
    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    try {
      const sticky = await getStickyMessage(channel.id);

      if (!sticky) {
        return replyError(target, 'No sticky message found in this channel.');
      }

      // Delete the last sticky message
      if (sticky.lastMessageId) {
        try {
          const oldMessage = await channel.messages.fetch(sticky.lastMessageId);
          await oldMessage.delete();
        } catch (err) {
          console.error('Failed to delete sticky message:', err);
        }
      }

      const result = await deleteStickyMessage(channel.id);

      if (!result.success) {
        return replyError(target, result.message);
      }

      const embed = {
        color: 0x5865F2,
        title: '🗑️ Sticky Message Removed',
        description: `Successfully removed the sticky message from ${channel}`,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true }
        ],
        footer: { text: `Removed by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Remove sticky message error:', error);
      await replyError(target, 'There was an error removing the sticky message.');
    }
  },

  async handleToggle(target, args, client, isPrefix) {
    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    try {
      const result = await toggleStickyMessage(channel.id);

      if (!result.success) {
        return replyError(target, result.message);
      }

      const sticky = await getStickyMessage(channel.id);

      // If disabled, delete the current sticky message
      if (!result.enabled && sticky.lastMessageId) {
        try {
          const oldMessage = await channel.messages.fetch(sticky.lastMessageId);
          await oldMessage.delete();
        } catch (err) {
          console.error('Failed to delete sticky message:', err);
        }
      }

      // If enabled, send a new sticky message
      if (result.enabled) {
        const sentMessage = await channel.send(sticky.message);
        await require('../../utils/sticky').updateLastMessageId(channel.id, sentMessage.id);
      }

      const embed = {
        color: 0x5865F2,
        title: `🔄 Sticky Message ${result.enabled ? 'Enabled' : 'Disabled'}`,
        description: `Successfully ${result.enabled ? 'enabled' : 'disabled'} the sticky message in ${channel}`,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Status', value: result.enabled ? 'Enabled' : 'Disabled', inline: true }
        ],
        footer: { text: `Toggled by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Toggle sticky message error:', error);
      await replyError(target, 'There was an error toggling the sticky message.');
    }
  },

  async handleList(target, args, client, isPrefix) {
    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const stickyMessages = await getAllStickyMessages(guildId);

      if (stickyMessages.length === 0) {
        return replyError(target, 'No sticky messages found in this server.');
      }

      const list = stickyMessages.map((sticky, index) => {
        const channel = isPrefix
          ? target.guild.channels.cache.get(sticky.channelId)
          : target.guild.channels.cache.get(sticky.channelId);
        const channelMention = channel ? `<#${sticky.channelId}>` : `Unknown Channel (${sticky.channelId})`;
        const status = sticky.enabled ? '✅' : '❌';
        const preview = sticky.message.substring(0, 50) + (sticky.message.length > 50 ? '...' : '');
        return `${index + 1}. ${status} ${channelMention}\n   ${preview}`;
      }).join('\n\n');

      const embed = {
        color: 0x5865F2,
        title: '📌 Sticky Messages',
        description: list,
        fields: [
          { name: 'Total', value: `${stickyMessages.length} sticky message${stickyMessages.length !== 1 ? 's' : ''}`, inline: true }
        ],
        footer: { text: '✅ = Enabled | ❌ = Disabled' },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('List sticky messages error:', error);
      await replyError(target, 'There was an error fetching sticky messages.');
    }
  },

  async handleView(target, args, client, isPrefix) {
    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    try {
      const sticky = await getStickyMessage(channel.id);

      if (!sticky) {
        return replyError(target, 'No sticky message found in this channel.');
      }

      const creator = await client.users.fetch(sticky.createdBy).catch(() => null);
      const creatorTag = creator ? creator.tag : 'Unknown User';

      const embed = {
        color: 0x5865F2,
        title: '📌 Sticky Message Info',
        description: `Information about the sticky message in ${channel}`,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Status', value: sticky.enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Created By', value: creatorTag, inline: true },
          { name: 'Created At', value: `<t:${Math.floor(sticky.createdAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Last Updated', value: `<t:${Math.floor(sticky.updatedAt.getTime() / 1000)}:R>`, inline: true },
          { name: 'Message', value: sticky.message.substring(0, 1000), inline: false }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('View sticky message error:', error);
      await replyError(target, 'There was an error fetching the sticky message.');
    }
  }
};
