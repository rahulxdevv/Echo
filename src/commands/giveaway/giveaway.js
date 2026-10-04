const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const {
  parseTime,
  formatTimeRemaining,
  createGiveaway,
  endGiveaway,
  rerollGiveaway,
  getActiveGiveaways,
  getEndedGiveaways,
  getGiveawayByMessageId,
  deleteGiveaway,
  buildGiveawayContainer
} = require('../../utils/giveaway');
const { replyError, replyWithCard } = require('../../utils/respond');

module.exports = {
  category: 'Giveaway',
  name: 'giveaway',
  description: 'Giveaway management commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management commands')
    .addSubcommand(subcommand =>
      subcommand.setName('start').setDescription('Start a new giveaway')
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 1h, 30m, 1d)').setRequired(true))
        .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
        .addStringOption(option => option.setName('prize').setDescription('Prize description').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to post giveaway in'))
        .addStringOption(option => option.setName('banner').setDescription('Giveaway banner image/GIF URL'))
        .addStringOption(option => option.setName('thumbnail').setDescription('Gift thumbnail image/GIF URL')))
    .addSubcommand(subcommand =>
      subcommand.setName('end').setDescription('End a giveaway early')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('reroll').setDescription('Reroll a giveaway winner')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('delete').setDescription('Delete a giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('list').setDescription('List active giveaways'))
    .addSubcommand(subcommand =>
      subcommand.setName('history').setDescription('View ended giveaways')),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) return replyError(message, 'Please specify a subcommand. Use `!giveaway start` to create a giveaway.');

    switch (subcommand) {
      case 'start':
      case 'create':
        return this.handleStart(message, args.slice(1), client, true);
      case 'end':
      case 'stop':
        return this.handleEnd(message, args.slice(1), client, true);
      case 'reroll':
        return this.handleReroll(message, args.slice(1), client, true);
      case 'delete':
      case 'remove':
        return this.handleDelete(message, args.slice(1), client, true);
      case 'list':
      case 'active':
        return this.handleList(message, args.slice(1), client, true);
      case 'history':
      case 'ended':
        return this.handleHistory(message, args.slice(1), client, true);
      default:
        return replyError(message, `Unknown subcommand: ${subcommand}`);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'start':
        return this.handleStart(interaction, [], client, false);
      case 'end':
        return this.handleEnd(interaction, [], client, false);
      case 'reroll':
        return this.handleReroll(interaction, [], client, false);
      case 'delete':
        return this.handleDelete(interaction, [], client, false);
      case 'list':
        return this.handleList(interaction, [], client, false);
      case 'history':
        return this.handleHistory(interaction, [], client, false);
    }
  },

  // Handlers
  async handleStart(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to start giveaways.');
    }

    let duration, winners, prize, channel, banner, thumbnail;

    if (isPrefix) {
      if (args.length < 3) {
        return replyError(target, 'Usage: `!giveaway start <duration> <winners> <prize> [--banner <url>] [--thumbnail <url>]`\nExample: `!giveaway start 1h 2 Discord Nitro`');
      }

      const durationStr = args[0];
      const winnersStr = args[1];

      const durationMs = parseTime(durationStr);
      if (!durationMs || durationMs < 1000) {
        return replyError(target, 'Invalid duration. Use format like: 30s, 5m, 1h, 2d');
      }

      winners = parseInt(winnersStr);
      if (isNaN(winners) || winners < 1) {
        return replyError(target, 'Winners must be a positive number.');
      }

      const remainingArgs = [];
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--banner' && args[i + 1]) {
          banner = args[i + 1];
          i++;
        } else if ((args[i] === '--thumbnail' || args[i] === '--gift') && args[i + 1]) {
          thumbnail = args[i + 1];
          i++;
        } else {
          remainingArgs.push(args[i]);
        }
      }
      prize = remainingArgs.join(' ');

      if (!prize) {
        return replyError(target, 'Please specify a prize for the giveaway.');
      }

      duration = durationMs;
      channel = target.channel;
    } else {
      const durationStr = target.options.getString('duration');
      winners = target.options.getInteger('winners');
      prize = target.options.getString('prize');
      channel = target.options.getChannel('channel') || target.channel;
      banner = target.options.getString('banner');
      thumbnail = target.options.getString('thumbnail');

      const durationMs = parseTime(durationStr);
      if (!durationMs || durationMs < 1000) {
        return replyError(target, 'Invalid duration. Use format like: 30s, 5m, 1h, 2d');
      }

      duration = durationMs;
    }

    try {
      const endTime = new Date(Date.now() + duration);
      const hostUser = isPrefix ? target.author : target.user;

      const container = buildGiveawayContainer({
        prize,
        winners,
        endTime,
        hostId: hostUser.id,
        participantsCount: 0,
        isEnded: false,
        banner,
        thumbnail
      });

      const giveawayMessage = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      await createGiveaway(
        target.guild.id,
        channel.id,
        giveawayMessage.id,
        hostUser.id,
        hostUser.tag,
        prize,
        winners,
        duration,
        banner,
        thumbnail
      );

      const reply = `Giveaway started in ${channel}!`;
      if (isPrefix) {
        await target.reply(reply);
      } else {
        await target.reply({ content: reply, ephemeral: true });
      }
    } catch (error) {
      console.error('Start giveaway error:', error);
      await replyError(target, 'I could not start the giveaway.');
    }
  },

  async handleEnd(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to end giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const giveawayData = await getGiveawayByMessageId(messageId);

      if (!giveawayData) {
        return replyError(target, 'Giveaway not found.');
      }

      if (giveawayData.ended) {
        return replyError(target, 'This giveaway has already ended.');
      }

      const result = await endGiveaway(messageId);

      if (!result) {
        return replyError(target, 'Could not end the giveaway.');
      }

      const { giveaway, winners } = result;

      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      let winnerText = 'No valid participants!';
      if (winners.length > 0) {
        winnerText = winners.map(id => `<@${id}>`).join(', ');
      }

      const container = buildGiveawayContainer({
        prize: giveaway.prize,
        winners: giveaway.winners,
        endTime: giveaway.endTime,
        hostId: giveaway.hostId,
        participantsCount: giveaway.participants.length,
        isEnded: true,
        isReroll: false,
        winnerText,
        banner: giveaway.banner,
        thumbnail: giveaway.thumbnail
      });

      await message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      if (winners.length > 0) {
        await channel.send(`Congratulations ${winnerText}! You won **${giveaway.prize}**!`);
      }

      const reply = `Giveaway ended successfully!`;
      if (isPrefix) {
        await target.reply(reply);
      } else {
        await target.reply({ content: reply, ephemeral: true });
      }
    } catch (error) {
      console.error('End giveaway error:', error);
      await replyError(target, 'I could not end the giveaway.');
    }
  },

  async handleReroll(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to reroll giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const result = await rerollGiveaway(messageId);

      if (!result) {
        return replyError(target, 'Giveaway not found or has not ended yet.');
      }

      const { giveaway, newWinners } = result;

      if (newWinners.length === 0) {
        return replyError(target, 'No more eligible participants to reroll.');
      }

      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      const winnerText = newWinners.map(id => `<@${id}>`).join(', ');

      const container = buildGiveawayContainer({
        prize: giveaway.prize,
        winners: giveaway.winners,
        endTime: giveaway.endTime,
        hostId: giveaway.hostId,
        participantsCount: giveaway.participants.length,
        isEnded: true,
        isReroll: true,
        winnerText,
        banner: giveaway.banner,
        thumbnail: giveaway.thumbnail
      });

      await message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      await channel.send(`New winner(s): ${winnerText}! You won **${giveaway.prize}**!`);

      const reply = `Giveaway rerolled successfully!`;
      if (isPrefix) {
        await target.reply(reply);
      } else {
        await target.reply({ content: reply, ephemeral: true });
      }
    } catch (error) {
      console.error('Reroll giveaway error:', error);
      await replyError(target, 'I could not reroll the giveaway.');
    }
  },

  async handleDelete(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to delete giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const giveawayData = await getGiveawayByMessageId(messageId);

      if (!giveawayData) {
        return replyError(target, 'Giveaway not found.');
      }

      const deleted = await deleteGiveaway(messageId);

      if (!deleted) {
        return replyError(target, 'Could not delete the giveaway.');
      }

      try {
        const channel = await client.channels.fetch(giveawayData.channelId);
        const message = await channel.messages.fetch(giveawayData.messageId);
        await message.delete();
      } catch (err) {
        // Message might already be deleted
      }

      const reply = `Giveaway deleted successfully!`;
      if (isPrefix) {
        await target.reply(reply);
      } else {
        await target.reply({ content: reply, ephemeral: true });
      }
    } catch (error) {
      console.error('Delete giveaway error:', error);
      await replyError(target, 'I could not delete the giveaway.');
    }
  },

  async handleList(target, args, client, isPrefix) {
    try {
      const giveaways = await getActiveGiveaways(target.guild.id);

      if (giveaways.length === 0) {
        const textDisplay = new TextDisplayBuilder().setContent(
          `# Active Giveaways\n\n` +
          `No active giveaways in this server.`
        );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(textDisplay);

        const payload = {
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        };

        return isPrefix ? target.reply(payload) : target.reply(payload);
      }

      const giveawayList = giveaways.map((g, index) => {
        return `**${index + 1}.** ${g.prize}\n` +
               `Channel: <#${g.channelId}> | Participants: ${g.participants.length}\n` +
               `Ends: <t:${Math.floor(g.endTime.getTime() / 1000)}:R>\n` +
               `ID: \`${g.messageId}\``;
      }).join('\n\n');

      const textDisplay = new TextDisplayBuilder().setContent(
        `# Active Giveaways\n\n` +
        `${giveawayList}\n\n` +
        `*${giveaways.length} active giveaway(s)*`
      );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay);

      const payload = {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      };

      return isPrefix ? target.reply(payload) : target.reply(payload);
    } catch (error) {
      console.error('List giveaways error:', error);
      await replyError(target, 'I could not fetch the giveaway list.');
    }
  },

  async handleHistory(target, args, client, isPrefix) {
    try {
      const giveaways = await getEndedGiveaways(target.guild.id, 10);

      if (giveaways.length === 0) {
        const textDisplay = new TextDisplayBuilder().setContent(
          `# Giveaway History\n\n` +
          `No ended giveaways in this server.`
        );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(textDisplay);

        const payload = {
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        };

        return isPrefix ? target.reply(payload) : target.reply(payload);
      }

      const giveawayList = giveaways.map((g, index) => {
        const winners = g.winnerIds.length > 0
          ? g.winnerIds.map(id => `<@${id}>`).join(', ')
          : 'No winners';
        return `**${index + 1}.** ${g.prize}\n` +
               `Winners: ${winners}\n` +
               `Participants: ${g.participants.length} | Ended: <t:${Math.floor(g.endTime.getTime() / 1000)}:R>`;
      }).join('\n\n');

      const textDisplay = new TextDisplayBuilder().setContent(
        `# Giveaway History\n\n` +
        `${giveawayList}\n\n` +
        `*Showing last ${giveaways.length} giveaway(s)*`
      );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay);

      const payload = {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      };

      return isPrefix ? target.reply(payload) : target.reply(payload);
    } catch (error) {
      console.error('History giveaways error:', error);
      await replyError(target, 'I could not fetch the giveaway history.');
    }
  },
};
