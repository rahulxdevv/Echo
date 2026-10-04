const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {
  getMessageStats,
  getTopMessagers,
  addMessages,
  removeMessages,
  clearMessages,
  blacklistChannel,
  unblacklistChannel,
  getBlacklistedChannels
} = require('../../utils/messages');
const { replyWithCard, replyError } = require('../../utils/respond');

module.exports = {
  category: 'Messages',
  name: 'messages',
  description: 'Manage and view message statistics',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('messages')
    .setDescription('Manage and view message statistics')
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check message count for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check (leave empty for yourself)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('Show top message senders in the server')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of top users to show (5-25)')
            .setMinValue(5)
            .setMaxValue(25)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add messages to a user (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add messages to')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of messages to add')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove messages from a user (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove messages from')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of messages to remove')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear message counts (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to clear messages for (leave empty for all)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetmy')
        .setDescription('Reset your own message count'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('blacklistchannel')
        .setDescription('Blacklist a channel from message tracking (Admin only)')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to blacklist')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('unblacklistchannel')
        .setDescription('Remove a channel from blacklist (Admin only)')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to unblacklist (leave empty for all)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('blacklistedchannels')
        .setDescription('Show all blacklisted channels')),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'check') {
      return this.handleCheck(message, args.slice(1), client, true);
    }

    switch (subcommand) {
      case 'leaderboard':
      case 'lb':
      case 'top':
        return this.handleLeaderboard(message, args.slice(1), client, true);

      case 'add':
      case 'addmessages':
        return this.handleAdd(message, args.slice(1), client, true);

      case 'remove':
      case 'removemessages':
        return this.handleRemove(message, args.slice(1), client, true);

      case 'clear':
      case 'clearmsgs':
        return this.handleClear(message, args.slice(1), client, true);

      case 'resetmy':
      case 'resetmymessages':
        return this.handleResetMy(message, args.slice(1), client, true);

      case 'blacklistchannel':
      case 'blacklist':
        return this.handleBlacklistChannel(message, args.slice(1), client, true);

      case 'unblacklistchannel':
      case 'unblacklist':
        return this.handleUnblacklistChannel(message, args.slice(1), client, true);

      case 'blacklistedchannels':
      case 'blacklisted':
      case 'listblacklisted':
        return this.handleBlacklistedChannels(message, args.slice(1), client, true);

      default:
        return this.handleCheck(message, args, client, true);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'check':
        return this.handleCheck(interaction, [], client, false);
      case 'leaderboard':
        return this.handleLeaderboard(interaction, [], client, false);
      case 'add':
        return this.handleAdd(interaction, [], client, false);
      case 'remove':
        return this.handleRemove(interaction, [], client, false);
      case 'clear':
        return this.handleClear(interaction, [], client, false);
      case 'resetmy':
        return this.handleResetMy(interaction, [], client, false);
      case 'blacklistchannel':
        return this.handleBlacklistChannel(interaction, [], client, false);
      case 'unblacklistchannel':
        return this.handleUnblacklistChannel(interaction, [], client, false);
      case 'blacklistedchannels':
        return this.handleBlacklistedChannels(interaction, [], client, false);
    }
  },

  async handleCheck(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first() || target.author
      : target.options.getUser('user') || target.user;

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const messageCount = await getMessageStats(guildId, user.id);

      const embed = {
        color: 0x5865F2,
        title: `${user.username}'s Messages`,
        description: `Message statistics for ${user.tag}`,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'Total Messages', value: `${messageCount.toLocaleString()}`, inline: true },
          { name: 'Rank', value: 'Coming soon', inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Messages check error:', error);
      await replyError(target, 'There was an error fetching message statistics.');
    }
  },

  async handleLeaderboard(target, args, client, isPrefix) {
    const limit = isPrefix
      ? parseInt(args[0]) || 10
      : target.options.getInteger('limit') || 10;

    if (limit < 5 || limit > 25) {
      return replyError(target, 'Limit must be between 5 and 25.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const topMessagers = await getTopMessagers(guildId, limit);

      if (topMessagers.length === 0) {
        return replyError(target, 'No message data found for this server.');
      }

      const leaderboardText = await Promise.all(
        topMessagers.map(async (messager, index) => {
          const user = await client.users.fetch(messager.userId).catch(() => null);
          const username = user ? user.tag : messager.username;
          return `**${index + 1}.** ${username} - ${messager.count.toLocaleString()} messages`;
        })
      );

      const embed = {
        color: 0x5865F2,
        title: 'Message Leaderboard',
        description: leaderboardText.join('\n'),
        footer: { text: `Top ${topMessagers.length} messagers in ${isPrefix ? target.guild.name : target.guild.name}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Message leaderboard error:', error);
      await replyError(target, 'There was an error fetching the message leaderboard.');
    }
  },

  async handleAdd(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? target.mentions.users.first()
      : target.options.getUser('user');

    if (!user) {
      return replyError(target, 'Please specify a user.');
    }

    const amount = isPrefix
      ? parseInt(args[1])
      : target.options.getInteger('amount');

    if (!amount || amount < 1) {
      return replyError(target, 'Please provide a valid amount (minimum 1).');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const tracker = await addMessages(guildId, user.id, user.tag, amount);

      const embed = {
        color: 0x5865F2,
        title: 'Messages Added',
        description: `Successfully added ${amount.toLocaleString()} message${amount !== 1 ? 's' : ''} to ${user.tag}`,
        fields: [
          { name: '👤 User', value: user.tag, inline: true },
          { name: 'Amount Added', value: `${amount.toLocaleString()}`, inline: true },
          { name: '💬 New Total', value: `${tracker.messageCount.toLocaleString()}`, inline: true }
        ],
        footer: { text: `Added by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Add messages error:', error);
      await replyError(target, 'There was an error adding messages.');
    }
  },

  async handleRemove(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? target.mentions.users.first()
      : target.options.getUser('user');

    if (!user) {
      return replyError(target, 'Please specify a user.');
    }

    const amount = isPrefix
      ? parseInt(args[1])
      : target.options.getInteger('amount');

    if (!amount || amount < 1) {
      return replyError(target, 'Please provide a valid amount (minimum 1).');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const tracker = await removeMessages(guildId, user.id, amount);

      if (!tracker) {
        return replyError(target, `No message data found for ${user.tag}.`);
      }

      const embed = {
        color: 0x5865F2,
        title: 'Messages Removed',
        description: `Successfully removed ${amount.toLocaleString()} message${amount !== 1 ? 's' : ''} from ${user.tag}`,
        fields: [
          { name: '👤 User', value: user.tag, inline: true },
          { name: 'Amount Removed', value: `${amount.toLocaleString()}`, inline: true },
          { name: '💬 New Total', value: `${tracker.messageCount.toLocaleString()}`, inline: true }
        ],
        footer: { text: `Removed by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Remove messages error:', error);
      await replyError(target, 'There was an error removing messages.');
    }
  },

  async handleClear(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? (args[0]?.toLowerCase() === 'all' ? null : target.mentions.users.first())
      : target.options.getUser('user');

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const deletedCount = await clearMessages(guildId, user ? user.id : null);

      const embed = {
        color: 0x5865F2,
        title: '🗑️ Messages Cleared',
        description: user
          ? `Cleared all messages for ${user.tag}`
          : 'Cleared all messages for the entire server',
        fields: [
          { name: 'Records Removed', value: `${deletedCount}`, inline: true }
        ],
        footer: { text: `Cleared by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Clear messages error:', error);
      await replyError(target, 'There was an error clearing messages.');
    }
  },

  async handleResetMy(target, args, client, isPrefix) {
    const userId = isPrefix ? target.author.id : target.user.id;
    const userTag = isPrefix ? target.author.tag : target.user.tag;

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const deletedCount = await clearMessages(guildId, userId);

      const embed = {
        color: 0x5865F2,
        title: '🔄 Your Messages Reset',
        description: 'Successfully reset your message count',
        fields: [
          { name: 'Messages Cleared', value: deletedCount > 0 ? 'Yes' : 'No data found', inline: true }
        ],
        footer: { text: `Reset by ${userTag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Reset my messages error:', error);
      await replyError(target, 'There was an error resetting your messages.');
    }
  },

  async handleBlacklistChannel(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const channel = isPrefix
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please specify a valid channel.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const blacklistedBy = isPrefix ? target.author.id : target.user.id;
      const result = await blacklistChannel(guildId, channel.id, channel.name, blacklistedBy);

      if (!result.success) {
        return replyError(target, result.message);
      }

      const embed = {
        color: 0x5865F2,
        title: '🚫 Channel Blacklisted',
        description: `Successfully blacklisted ${channel}`,
        fields: [
          { name: '📝 Channel', value: `${channel.name}`, inline: true },
          { name: '🆔 Channel ID', value: channel.id, inline: true }
        ],
        footer: { text: `Blacklisted by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Blacklist channel error:', error);
      await replyError(target, 'There was an error blacklisting the channel.');
    }
  },

  async handleUnblacklistChannel(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const isAll = isPrefix && args[0]?.toLowerCase() === 'all';
    const channel = isPrefix && !isAll
      ? target.mentions.channels.first() || target.guild.channels.cache.get(args[0])
      : target.options?.getChannel('channel');

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const deletedCount = await unblacklistChannel(guildId, channel ? channel.id : null);

      const embed = {
        color: 0x5865F2,
        title: 'Channel Unblacklisted',
        description: channel
          ? `Successfully unblacklisted ${channel}`
          : 'Successfully unblacklisted all channels',
        fields: [
          { name: 'Channels Removed', value: `${deletedCount}`, inline: true }
        ],
        footer: { text: `Unblacklisted by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Unblacklist channel error:', error);
      await replyError(target, 'There was an error unblacklisting the channel.');
    }
  },

  async handleBlacklistedChannels(target, args, client, isPrefix) {
    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const blacklisted = await getBlacklistedChannels(guildId);

      if (blacklisted.length === 0) {
        return replyError(target, 'No channels are currently blacklisted.');
      }

      const channelList = blacklisted.map((ch, index) => {
        const channel = isPrefix
          ? target.guild.channels.cache.get(ch.channelId)
          : target.guild.channels.cache.get(ch.channelId);
        const channelMention = channel ? `<#${ch.channelId}>` : `${ch.channelName} (Deleted)`;
        return `${index + 1}. ${channelMention} - <t:${Math.floor(ch.blacklistedAt.getTime() / 1000)}:R>`;
      }).join('\n');

      const embed = {
        color: 0x5865F2,
        title: '🚫 Blacklisted Channels',
        description: channelList,
        fields: [
          { name: 'Total', value: `${blacklisted.length} channel${blacklisted.length !== 1 ? 's' : ''}`, inline: true }
        ],
        footer: { text: 'Messages in these channels are not tracked' },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Blacklisted channels error:', error);
      await replyError(target, 'There was an error fetching blacklisted channels.');
    }
  }
};
