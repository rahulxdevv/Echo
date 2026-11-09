const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder
} = require('discord.js');
const emojis = require('../../utils/emojis');
const {
  parseTime,
  createGiveaway,
  endGiveaway,
  rerollGiveaway,
  getActiveGiveaways,
  getEndedGiveaways,
  getGiveawayByMessageId,
  deleteGiveaway,
  pauseGiveaway,
  resumeGiveaway,
  updateGiveaway,
  buildGiveawayContainer,
  getGiveawayConfig,
  updateGiveawayConfig,
  resetGiveawayConfig,
  isValidUrl,
  parseColor,
  DEFAULT_GIVEAWAY_TITLE,
  DEFAULT_GIVEAWAY_COLOR,
  sendGiveawayMessage,
  buildGiveawayPayload
} = require('../../utils/giveaway');
const { replyError, replyNotice } = require('../../utils/respond');

function hasManageGuild(target) {
  return Boolean(target.member?.permissions?.has(PermissionFlagsBits.ManageGuild));
}

function parseArgs(args = []) {
  const flags = {};
  const positionals = [];
  const source = Array.isArray(args) ? args : [];

  for (let i = 0; i < source.length; i++) {
    const arg = source[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2).toLowerCase();
      const values = [];
      let j = i + 1;

      while (j < source.length && !source[j].startsWith('--')) {
        values.push(source[j]);
        j++;
      }

      flags[key] = values.join(' ');
      i = j - 1;
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
}

async function resolveChannel(guild, input) {
  if (!input) return null;
  const id = String(input).replace(/[<#>]/g, '');
  return guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
}

async function getGuildGiveaway(guildId, messageId) {
  const giveaway = await getGiveawayByMessageId(messageId);
  if (!giveaway || giveaway.guildId !== guildId) return null;
  return giveaway;
}

async function replySuccess(target, content, isPrefix) {
  return replyNotice(target, content, { ephemeral: !isPrefix });
}

function formatConfig(config) {
  const color = `#${config.color.toString(16).padStart(6, '0').toUpperCase()}`;
  const title = config.title || `${DEFAULT_GIVEAWAY_TITLE} (default)`;
  const bannerLabel = config.banner && config.banner.startsWith('attachment://')
    ? 'Default Glow (Echo Bot Giveaway Glow.png)'
    : config.banner;
  const thumbLabel = config.thumbnail ? config.thumbnail : 'None (no small box)';

  return [
    `${emojis.common.gear} **Giveaway config**`,
    `**Banner:** ${bannerLabel}`,
    `**Thumbnail:** ${thumbLabel}`,
    `**Accent color:** ${color} (default #${DEFAULT_GIVEAWAY_COLOR.toString(16).padStart(6, '0').toUpperCase()})`,
    `**Title:** ${title}`,
    '',
    config.isCustom
      ? 'Use `/giveaway config` with new values to update.'
      : 'No custom config set - defaults are shown.'
  ].join('\n');
}

function buildStoredGiveawayContainer(giveaway, { isEnded = false, isReroll = false, unclaimed = false, winnerText = null } = {}) {
  return buildGiveawayContainer({
    prize: giveaway.prize,
    winners: giveaway.winners,
    endTime: giveaway.endTime,
    hostId: giveaway.hostId,
    participantsCount: (giveaway.participants || []).length,
    isEnded,
    isReroll,
    isPaused: giveaway.paused,
    isDrop: giveaway.type === 'drop',
    unclaimed,
    dropEmoji: giveaway.dropEmoji,
    winnerText,
    banner: giveaway.banner,
    thumbnail: giveaway.thumbnail,
    color: giveaway.color,
    title: giveaway.title
  });
}

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
        .addStringOption(option => option.setName('thumbnail').setDescription('Thumbnail image/GIF URL (optional, no small box by default)'))
        .addStringOption(option => option.setName('color').setDescription('Accent color (hex, e.g. #7BFF9E) - defaults to light green')))
    .addSubcommand(subcommand =>
      subcommand.setName('drop').setDescription('Start a gift drop - the first reaction wins')
        .addStringOption(option => option.setName('prize').setDescription('Prize description').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to post the drop in'))
        .addStringOption(option => option.setName('duration').setDescription('Optional expiry (e.g., 1h, 30m)'))
        .addStringOption(option => option.setName('banner').setDescription('Drop banner image/GIF URL'))
        .addStringOption(option => option.setName('thumbnail').setDescription('Thumbnail image/GIF URL (optional, no small box by default)'))
        .addStringOption(option => option.setName('color').setDescription('Accent color (hex, e.g. #7BFF9E) - defaults to light green')))
    .addSubcommand(subcommand =>
      subcommand.setName('edit').setDescription('Edit an ongoing giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
        .addStringOption(option => option.setName('prize').setDescription('New prize description'))
        .addIntegerOption(option => option.setName('winners').setDescription('New winner count').setMinValue(1))
        .addStringOption(option => option.setName('duration').setDescription('New duration from now (e.g., 1h, 2d)'))
        .addStringOption(option => option.setName('banner').setDescription('New banner image/GIF URL'))
        .addStringOption(option => option.setName('thumbnail').setDescription('New thumbnail image/GIF URL'))
        .addStringOption(option => option.setName('color').setDescription('New accent color (hex, e.g. #7BFF9E)')))
    .addSubcommand(subcommand =>
      subcommand.setName('pause').setDescription('Pause an ongoing giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('resume').setDescription('Resume a paused giveaway')
        .addStringOption(option => option.setName('message_id').setDescription('Giveaway message ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('config').setDescription('Configure giveaway appearance for this server')
        .addStringOption(option => option.setName('banner').setDescription('Default banner image/GIF URL'))
        .addStringOption(option => option.setName('thumbnail').setDescription('Default thumbnail image/GIF URL'))
        .addStringOption(option => option.setName('color').setDescription('Accent color (hex, e.g. #7BFF9E)'))
        .addStringOption(option => option.setName('title').setDescription('Default giveaway title'))
        .addBooleanOption(option => option.setName('reset').setDescription('Reset the server giveaway config')))
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
      case 'drop':
      case 'giftdrop':
        return this.handleDrop(message, args.slice(1), client, true);
      case 'edit':
      case 'update':
        return this.handleEdit(message, args.slice(1), client, true);
      case 'pause':
        return this.handlePause(message, args.slice(1), client, true);
      case 'resume':
      case 'unpause':
        return this.handleResume(message, args.slice(1), client, true);
      case 'config':
      case 'settings':
        return this.handleConfig(message, args.slice(1), client, true);
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
      case 'drop':
        return this.handleDrop(interaction, [], client, false);
      case 'edit':
        return this.handleEdit(interaction, [], client, false);
      case 'pause':
        return this.handlePause(interaction, [], client, false);
      case 'resume':
        return this.handleResume(interaction, [], client, false);
      case 'config':
        return this.handleConfig(interaction, [], client, false);
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
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to start giveaways.');
    }

    let duration, winners, prize, channel, banner, thumbnail, colorInput;

    if (isPrefix) {
      if (args.length < 3) {
        return replyError(target, 'Usage: `!giveaway start <duration> <winners> <prize> [--banner <url>] [--thumbnail <url>] [--color #7BFF9E]`\nExample: `!giveaway start 1h 2 Discord Nitro`');
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
        } else if (args[i] === '--color' && args[i + 1]) {
          colorInput = args[i + 1];
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
      banner = target.options.getString('banner') ?? undefined;
      thumbnail = target.options.getString('thumbnail') ?? undefined;
      colorInput = target.options.getString('color') ?? undefined;

      const durationMs = parseTime(durationStr);
      if (!durationMs || durationMs < 1000) {
        return replyError(target, 'Invalid duration. Use format like: 30s, 5m, 1h, 2d');
      }

      duration = durationMs;
    }

    let resolvedColorOverride = null;
    if (colorInput !== undefined && colorInput !== null && String(colorInput).trim() !== '') {
      resolvedColorOverride = parseColor(colorInput);
      if (resolvedColorOverride === null) {
        return replyError(target, 'Invalid color. Use a hex value like `#7BFF9E`.');
      }
    }

    try {
      const config = await getGiveawayConfig(target.guild.id);
      const resolvedBanner = banner || config.banner;
      const resolvedThumbnail = thumbnail || config.thumbnail;
      const resolvedColor = resolvedColorOverride !== null ? resolvedColorOverride : config.color;
      const endTime = new Date(Date.now() + duration);
      const hostUser = isPrefix ? target.author : target.user;

      const container = buildGiveawayContainer({
        prize,
        winners,
        endTime,
        hostId: hostUser.id,
        participantsCount: 0,
        isEnded: false,
        banner: resolvedBanner,
        thumbnail: resolvedThumbnail,
        color: resolvedColor,
        title: config.title
      });

      const giveawayMessage = await sendGiveawayMessage(channel, container);

      await createGiveaway(
        target.guild.id,
        channel.id,
        giveawayMessage.id,
        hostUser.id,
        hostUser.tag,
        prize,
        winners,
        duration,
        resolvedBanner,
        resolvedThumbnail,
        { type: 'button', color: resolvedColor, title: config.title }
      );

      return replySuccess(target, `Giveaway started in ${channel}!`, isPrefix);
    } catch (error) {
      console.error('Start giveaway error:', error);
      await replyError(target, 'I could not start the giveaway.');
    }
  },

  async handleDrop(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to start gift drops.');
    }

    let prize, channel, durationStr, banner, thumbnail, colorInput;

    if (isPrefix) {
      const { flags, positionals } = parseArgs(args);
      prize = positionals.join(' ').trim();
      durationStr = flags.duration;
      banner = flags.banner;
      thumbnail = flags.thumbnail || flags.gift;
      colorInput = flags.color;
      channel = flags.channel
        ? await resolveChannel(target.guild, flags.channel)
        : target.channel;

      if (!channel) {
        return replyError(target, 'Could not find that channel.');
      }
    } else {
      prize = target.options.getString('prize');
      channel = target.options.getChannel('channel') || target.channel;
      durationStr = target.options.getString('duration') ?? undefined;
      banner = target.options.getString('banner') ?? undefined;
      thumbnail = target.options.getString('thumbnail') ?? undefined;
      colorInput = target.options.getString('color') ?? undefined;
    }

    if (!prize) {
      return replyError(target, 'Please specify a prize for the gift drop.');
    }

    let duration = null;
    if (durationStr) {
      duration = parseTime(durationStr);
      if (!duration || duration < 1000) {
        return replyError(target, 'Invalid duration. Use format like: 30s, 5m, 1h, 2d');
      }
    }

    let resolvedColorOverride = null;
    if (colorInput !== undefined && colorInput !== null && String(colorInput).trim() !== '') {
      resolvedColorOverride = parseColor(colorInput);
      if (resolvedColorOverride === null) {
        return replyError(target, 'Invalid color. Use a hex value like `#7BFF9E`.');
      }
    }

    try {
      const config = await getGiveawayConfig(target.guild.id);
      const resolvedBanner = banner || config.banner;
      const resolvedThumbnail = thumbnail || config.thumbnail;
      const resolvedColor = resolvedColorOverride !== null ? resolvedColorOverride : config.color;
      const hostUser = isPrefix ? target.author : target.user;
      const dropEmoji = emojis.common.gift;
      const endTime = duration ? new Date(Date.now() + duration) : null;

      const container = buildGiveawayContainer({
        prize,
        winners: 1,
        endTime,
        hostId: hostUser.id,
        participantsCount: 0,
        isEnded: false,
        isDrop: true,
        dropEmoji,
        banner: resolvedBanner,
        thumbnail: resolvedThumbnail,
        color: resolvedColor,
        title: config.title
      });

      const giveawayMessage = await sendGiveawayMessage(channel, container);

      await createGiveaway(
        target.guild.id,
        channel.id,
        giveawayMessage.id,
        hostUser.id,
        hostUser.tag,
        prize,
        1,
        duration,
        resolvedBanner,
        resolvedThumbnail,
        {
          type: 'drop',
          color: resolvedColor,
          title: config.title,
          dropEmoji
        }
      );

      try {
        await giveawayMessage.react(dropEmoji);
      } catch (error) {
        await deleteGiveaway(giveawayMessage.id).catch(() => null);
        await giveawayMessage.delete().catch(() => null);
        throw error;
      }

      const endsText = endTime ? ` It expires <t:${Math.floor(endTime.getTime() / 1000)}:R>.` : '';
      return replySuccess(
        target,
        `Gift drop started in ${channel}! First to react with ${dropEmoji} wins **${prize}**.${endsText}`,
        isPrefix
      );
    } catch (error) {
      console.error('Giveaway drop error:', error);
      await replyError(target, 'I could not start the gift drop.');
    }
  },

  async handleEdit(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to edit giveaways.');
    }

    let messageId, prize, winners, durationStr, banner, thumbnail, colorInput;

    if (isPrefix) {
      const { flags, positionals } = parseArgs(args);
      messageId = positionals[0];
      prize = flags.prize;
      winners = flags.winners !== undefined ? parseInt(flags.winners, 10) : undefined;
      durationStr = flags.duration;
      banner = flags.banner;
      thumbnail = flags.thumbnail || flags.gift;
      colorInput = flags.color;
    } else {
      messageId = target.options.getString('message_id');
      prize = target.options.getString('prize') ?? undefined;
      winners = target.options.getInteger('winners') ?? undefined;
      durationStr = target.options.getString('duration') ?? undefined;
      banner = target.options.getString('banner') ?? undefined;
      thumbnail = target.options.getString('thumbnail') ?? undefined;
      colorInput = target.options.getString('color') ?? undefined;
    }

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    if (prize === undefined && winners === undefined && durationStr === undefined && banner === undefined && thumbnail === undefined && colorInput === undefined) {
      return replyError(target, 'Please provide at least one field to edit (prize, winners, duration, banner, thumbnail, or color).');
    }

    const updates = {};

    if (prize !== undefined) {
      const cleanPrize = String(prize).trim();
      if (!cleanPrize) {
        return replyError(target, 'Prize cannot be empty.');
      }
      if (cleanPrize.length > 200) {
        return replyError(target, 'Prize must be 200 characters or fewer.');
      }
      updates.prize = cleanPrize;
    }

    if (winners !== undefined) {
      if (!Number.isInteger(winners) || winners < 1) {
        return replyError(target, 'Winners must be a positive number.');
      }
      updates.winners = winners;
    }

    if (durationStr !== undefined) {
      const duration = parseTime(durationStr);
      if (!duration || duration < 1000) {
        return replyError(target, 'Invalid duration. Use format like: 30s, 5m, 1h, 2d');
      }
      updates.duration = duration;
    }

    if (banner !== undefined) {
      if (!isValidUrl(banner)) {
        return replyError(target, 'Banner must be a valid http(s) image/GIF URL.');
      }
      updates.banner = banner;
    }

    if (thumbnail !== undefined) {
      if (!isValidUrl(thumbnail)) {
        return replyError(target, 'Thumbnail must be a valid http(s) image/GIF URL.');
      }
      updates.thumbnail = thumbnail;
    }

    if (colorInput !== undefined) {
      const color = parseColor(colorInput);
      if (color === null) {
        return replyError(target, 'Invalid color. Use a hex value like `#7BFF9E`.');
      }
      updates.color = color;
    }

    try {
      const existing = await getGuildGiveaway(target.guild.id, messageId);

      if (!existing) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      if (existing.ended) {
        return replyError(target, 'This giveaway has already ended.');
      }

      if (existing.type === 'drop' && updates.winners !== undefined) {
        return replyError(target, 'Gift drops always have exactly one winner (the first reaction).');
      }

      const giveaway = await updateGiveaway(messageId, updates);

      if (!giveaway) {
        return replyError(target, 'Could not update the giveaway.');
      }

      try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        const container = buildStoredGiveawayContainer(giveaway);

        await message.edit(buildGiveawayPayload(container));
      } catch (error) {
        console.error('Edit giveaway message error:', error);
      }

      return replySuccess(target, 'Giveaway updated successfully.', isPrefix);
    } catch (error) {
      console.error('Edit giveaway error:', error);
      await replyError(target, 'I could not edit the giveaway.');
    }
  },

  async handlePause(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to pause giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const existing = await getGuildGiveaway(target.guild.id, messageId);

      if (!existing) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      if (existing.ended) {
        return replyError(target, 'This giveaway has already ended.');
      }

      const result = await pauseGiveaway(messageId);

      if (!result) {
        return replyError(target, 'Giveaway not found or already ended.');
      }

      if (result.alreadyPaused) {
        return replyError(target, 'This giveaway is already paused.');
      }

      try {
        const channel = await client.channels.fetch(result.giveaway.channelId);
        const message = await channel.messages.fetch(result.giveaway.messageId);
        const container = buildStoredGiveawayContainer(result.giveaway);

        await message.edit(buildGiveawayPayload(container));
      } catch (error) {
        console.error('Pause giveaway message error:', error);
      }

      return replySuccess(target, 'Giveaway paused. Entries are closed until it is resumed.', isPrefix);
    } catch (error) {
      console.error('Pause giveaway error:', error);
      await replyError(target, 'I could not pause the giveaway.');
    }
  },

  async handleResume(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to resume giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const existing = await getGuildGiveaway(target.guild.id, messageId);

      if (!existing) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      if (existing.ended) {
        return replyError(target, 'This giveaway has already ended.');
      }

      if (!existing.paused) {
        return replyError(target, 'This giveaway is not paused.');
      }

      const result = await resumeGiveaway(messageId);

      if (!result) {
        return replyError(target, 'Giveaway not found or already ended.');
      }

      try {
        const channel = await client.channels.fetch(result.giveaway.channelId);
        const message = await channel.messages.fetch(result.giveaway.messageId);
        const container = buildStoredGiveawayContainer(result.giveaway);

        await message.edit(buildGiveawayPayload(container));
      } catch (error) {
        console.error('Resume giveaway message error:', error);
      }

      return replySuccess(target, 'Giveaway resumed. Entries are open again.', isPrefix);
    } catch (error) {
      console.error('Resume giveaway error:', error);
      await replyError(target, 'I could not resume the giveaway.');
    }
  },

  async handleConfig(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to configure giveaways.');
    }

    let banner, thumbnail, colorInput, title, reset = false;
    let hasInput = false;

    if (isPrefix) {
      const { flags } = parseArgs(args);
      hasInput = Object.keys(flags).length > 0;
      reset = 'reset' in flags;
      banner = flags.banner;
      thumbnail = flags.thumbnail || flags.gift;
      colorInput = flags.color;
      title = flags.title;
    } else {
      banner = target.options.getString('banner') ?? undefined;
      thumbnail = target.options.getString('thumbnail') ?? undefined;
      colorInput = target.options.getString('color') ?? undefined;
      title = target.options.getString('title') ?? undefined;
      reset = target.options.getBoolean('reset') === true;
      hasInput = banner !== undefined || thumbnail !== undefined || colorInput !== undefined || title !== undefined || reset;
    }

    if (!hasInput) {
      const config = await getGiveawayConfig(target.guild.id);
      return replySuccess(target, formatConfig(config), isPrefix);
    }

    if (reset) {
      await resetGiveawayConfig(target.guild.id);
      return replySuccess(target, `${emojis.status.success} Giveaway config reset to defaults.`, isPrefix);
    }

    const updates = {};

    if (banner !== undefined) {
      if (!isValidUrl(banner)) {
        return replyError(target, 'Banner must be a valid http(s) image/GIF URL.');
      }
      updates.banner = banner;
    }

    if (thumbnail !== undefined) {
      if (!isValidUrl(thumbnail)) {
        return replyError(target, 'Thumbnail must be a valid http(s) image/GIF URL.');
      }
      updates.thumbnail = thumbnail;
    }

    if (colorInput !== undefined) {
      const color = parseColor(colorInput);
      if (color === null) {
        return replyError(target, 'Invalid color. Use a hex value like `#7BFF9E`.');
      }
      updates.color = color;
    }

    if (title !== undefined) {
      const cleanTitle = String(title).replace(/\s+/g, ' ').trim();
      if (!cleanTitle) {
        return replyError(target, 'Title cannot be empty.');
      }
      if (cleanTitle.length > 100) {
        return replyError(target, 'Title must be 100 characters or fewer.');
      }
      updates.title = cleanTitle;
    }

    if (Object.keys(updates).length === 0) {
      const config = await getGiveawayConfig(target.guild.id);
      return replySuccess(target, formatConfig(config), isPrefix);
    }

    try {
      await updateGiveawayConfig(target.guild.id, updates);
      const config = await getGiveawayConfig(target.guild.id);
      return replySuccess(target, `${emojis.status.success} Giveaway config updated.\n${formatConfig(config)}`, isPrefix);
    } catch (error) {
      console.error('Giveaway config error:', error);
      await replyError(target, 'I could not update the giveaway config.');
    }
  },

  async handleEnd(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to end giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const giveawayData = await getGuildGiveaway(target.guild.id, messageId);

      if (!giveawayData) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      if (giveawayData.ended) {
        return replyError(target, 'This giveaway has already ended.');
      }

      const result = await endGiveaway(messageId);

      if (!result) {
        return replyError(target, 'Could not end the giveaway.');
      }

      const { giveaway, winners, noParticipants } = result;

      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);

      let winnerText = noParticipants ? 'No one entered' : 'No valid participants!';
      if (winners.length > 0) {
        winnerText = winners.map(id => `<@${id}>`).join(', ');
      }

      const container = buildStoredGiveawayContainer(giveaway, {
        isEnded: true,
        unclaimed: giveaway.type === 'drop' && winners.length === 0,
        winnerText
      });

      await message.edit(buildGiveawayPayload(container));

      if (winners.length > 0) {
        await channel.send(`Congratulations ${winnerText}! You won **${giveaway.prize}**!`);
      } else {
        await channel.send(`Giveaway for **${giveaway.prize}** ended with **no participants** - no winners this time.`);
      }

      if (noParticipants) {
        return replySuccess(target, 'Giveaway ended with no participants - no winners.', isPrefix);
      }
      return replySuccess(target, 'Giveaway ended successfully!', isPrefix);
    } catch (error) {
      console.error('End giveaway error:', error);
      await replyError(target, 'I could not end the giveaway.');
    }
  },

  async handleReroll(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to reroll giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const giveawayData = await getGuildGiveaway(target.guild.id, messageId);

      if (!giveawayData) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      if (giveawayData.type === 'drop') {
        return replyError(target, 'Gift drops cannot be rerolled - the first reaction already won.');
      }

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

      const container = buildStoredGiveawayContainer(giveaway, {
        isEnded: true,
        isReroll: true,
        winnerText
      });

      await message.edit(buildGiveawayPayload(container));

      await channel.send(`New winner(s): ${winnerText}! You won **${giveaway.prize}**!`);

      return replySuccess(target, 'Giveaway rerolled successfully!', isPrefix);
    } catch (error) {
      console.error('Reroll giveaway error:', error);
      await replyError(target, 'I could not reroll the giveaway.');
    }
  },

  async handleDelete(target, args, client, isPrefix) {
    if (!hasManageGuild(target)) {
      return replyError(target, 'You need Manage Server permission to delete giveaways.');
    }

    const messageId = isPrefix ? args[0] : target.options.getString('message_id');

    if (!messageId) {
      return replyError(target, 'Please provide a giveaway message ID.');
    }

    try {
      const giveawayData = await getGuildGiveaway(target.guild.id, messageId);

      if (!giveawayData) {
        return replyError(target, 'Giveaway not found in this server.');
      }

      const deleted = await deleteGiveaway(messageId);

      if (!deleted) {
        return replyError(target, 'Could not delete the giveaway.');
      }

      try {
        const channel = await client.channels.fetch(giveawayData.channelId);
        const message = await channel.messages.fetch(giveawayData.messageId);
        await message.delete();
      } catch (error) {
        // Message might already be deleted or inaccessible.
      }

      return replySuccess(target, 'Giveaway deleted successfully!', isPrefix);
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

        return target.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const giveawayList = giveaways.map((g, index) => {
        const ends = g.endTime
          ? `<t:${Math.floor(g.endTime.getTime() / 1000)}:R>`
          : 'No expiry';
        const status = g.paused ? 'Paused' : 'Active';
        const type = g.type === 'drop' ? 'Gift drop' : 'Button';
        return `**${index + 1}.** ${g.prize}\n` +
               `Channel: <#${g.channelId}> | Participants: ${g.participants.length}\n` +
               `Type: ${type} | Status: ${status}\n` +
               `Ends: ${ends}\n` +
               `ID: \`${g.messageId}\``;
      }).join('\n\n');

      const textDisplay = new TextDisplayBuilder().setContent(
        `# Active Giveaways\n\n` +
        `${giveawayList}\n\n` +
        `*${giveaways.length} active giveaway(s)*`
      );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay);

      return target.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
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

        return target.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const giveawayList = giveaways.map((g, index) => {
        const winners = g.winnerIds.length > 0
          ? g.winnerIds.map(id => `<@${id}>`).join(', ')
          : 'No winners';
        const endedAt = g.endedAt || g.endTime || g.createdAt;
        const endedText = endedAt
          ? `<t:${Math.floor(new Date(endedAt).getTime() / 1000)}:R>`
          : 'Unknown';
        const type = g.type === 'drop' ? 'Gift drop' : 'Button';
        return `**${index + 1}.** ${g.prize}\n` +
               `Winners: ${winners}\n` +
               `Type: ${type} | Participants: ${g.participants.length} | Ended: ${endedText}`;
      }).join('\n\n');

      const textDisplay = new TextDisplayBuilder().setContent(
        `# Giveaway History\n\n` +
        `${giveawayList}\n\n` +
        `*Showing last ${giveaways.length} giveaway(s)*`
      );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay);

      return target.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('History giveaways error:', error);
      await replyError(target, 'I could not fetch the giveaway history.');
    }
  },
};
