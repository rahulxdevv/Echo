const {
  ContainerBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const Giveaway = require('../models/Giveaway');
const GiveawayConfig = require('../models/GiveawayConfig');
const emojis = require('./emojis');

const OLD_GIFT_THUMBNAIL = 'https://media.tenor.com/t7aI5VVWTvwAAAAC/gift-christmas-gift.gif';
const OLD_GIVEAWAY_BANNER = 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif';
const GLOW_IMAGE_FILENAME = 'giveaway-glow.png';
const GLOW_IMAGE_PATH = path.join(__dirname, '../../public/Echo Bot Giveaway Glow.png');
const DEFAULT_GLOW_BANNER = `attachment://${GLOW_IMAGE_FILENAME}`;
const DEFAULT_GIFT_THUMBNAIL = process.env.GIVEAWAY_THUMBNAIL_URL || null;
const DEFAULT_GIVEAWAY_BANNER = process.env.GIVEAWAY_BANNER_URL || DEFAULT_GLOW_BANNER;
const DEFAULT_GIVEAWAY_COLOR = 0x7BFF9E;
const DEFAULT_GIVEAWAY_TITLE = `${emojis.common.celebration} Giveaway`;
const DEFAULT_DROP_TITLE = `${emojis.common.gift} Gift Drop`;
const DEFAULT_DROP_EMOJI = emojis.common.gift;

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  if (str.startsWith('attachment://')) return true;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseColor(input) {
  if (input === null || input === undefined) return null;

  const value = String(input).trim();
  if (!value) return null;

  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value.slice(1), 16);
  }

  if (/^0x[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value.slice(2), 16);
  }

  if (/^[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value, 16);
  }

  if (/^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed >= 0 && parsed <= 0xFFFFFF ? parsed : null;
  }

  return null;
}

function buildGiveawayContainer({
  prize,
  winners = 1,
  endTime,
  hostId,
  participantsCount = 0,
  isEnded = false,
  isReroll = false,
  isPaused = false,
  isDrop = false,
  unclaimed = false,
  dropEmoji = DEFAULT_DROP_EMOJI,
  winnerText = null,
  banner = null,
  thumbnail = null,
  color = null,
  title = null
}) {
  const container = new ContainerBuilder();

  const effectiveColor = Number.isInteger(color) ? color : DEFAULT_GIVEAWAY_COLOR;
  container.setAccentColor(effectiveColor);

  // Migrate legacy banner/thumbnail values: old giphy banner -> Glow, old gift thumb -> none.
  let effectiveBanner = banner;
  if (!effectiveBanner || effectiveBanner === OLD_GIVEAWAY_BANNER) {
    effectiveBanner = DEFAULT_GIVEAWAY_BANNER;
  }
  const bannerUrl = isValidUrl(effectiveBanner) ? effectiveBanner : DEFAULT_GIVEAWAY_BANNER;
  if (bannerUrl) {
    const mediaGallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(bannerUrl)
    );
    container.addMediaGalleryComponents(mediaGallery);
  }

  const resolvedTitle = (typeof title === 'string' && title.trim())
    ? title.trim()
    : (isDrop ? DEFAULT_DROP_TITLE : DEFAULT_GIVEAWAY_TITLE);

  const endTimestamp = endTime
    ? Math.floor(new Date(endTime).getTime() / 1000)
    : null;

  let content = '';

  if (isEnded) {
    const noParticipants = participantsCount === 0;
    const heading = isReroll
      ? 'Giveaway Ended (Rerolled)'
      : (isDrop
        ? (unclaimed || noParticipants ? 'Gift Drop Expired' : 'Gift Drop Claimed')
        : (noParticipants ? 'Giveaway Ended - No Participants' : 'Giveaway Ended'));

    content = `# ${heading}\n\n` +
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winnerText || (noParticipants ? 'No one entered' : 'No valid participants!')}\n` +
      `**Hosted by:** <@${hostId}>\n\n` +
      `**Total Participants:** ${participantsCount}`;
  } else if (isPaused) {
    content = `# ${isDrop ? '⏸️ Gift Drop Paused' : '⏸️ Giveaway Paused'}\n\n` +
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winners}\n` +
      `**Hosted by:** <@${hostId}>\n` +
      `**Participants:** ${participantsCount}\n\n` +
      `*Entries are paused until an admin resumes this giveaway.*`;
  } else if (isDrop) {
    content = `# ${resolvedTitle}\n\n` +
      `**Prize:** ${prize}\n` +
      `**How to win:** React with ${dropEmoji} first\n` +
      (endTimestamp ? `**Ends:** <t:${endTimestamp}:R>\n` : '') +
      `**Hosted by:** <@${hostId}>\n` +
      `**Participants:** ${participantsCount}`;
  } else {
    content = `# ${resolvedTitle}\n\n` +
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winners}\n` +
      (endTimestamp ? `**Ends:** <t:${endTimestamp}:R>\n` : '') +
      `**Hosted by:** <@${hostId}>\n` +
      `**Participants:** ${participantsCount}`;
  }

  const textDisplay = new TextDisplayBuilder().setContent(content);

  // No small-box thumbnail by default (gift gif removed).
  // Only render Section thumbnail when an explicit URL/attachment is set.
  const rawThumb = thumbnail;
  const isLegacyThumb = rawThumb === OLD_GIFT_THUMBNAIL;
  const thumbnailUrl = (!rawThumb || isLegacyThumb) ? null : (isValidUrl(rawThumb) ? rawThumb : null);
  if (thumbnailUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(textDisplay)
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(textDisplay);
  }

  if (!isEnded && !isPaused && !isDrop) {
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);

    // Secondary (grey) for clear emoji visibility against the light-green accent.
    const button = new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('Enter Giveaway')
      .setEmoji(emojis.common.celebration)
      .setStyle(ButtonStyle.Secondary);

    container.addSeparatorComponents(separator);
    container.addActionRowComponents(actionRow => actionRow.setComponents(button));
  }

  return container;
}

function parseTime(timeString) {
  const regex = /(\d+)([smhd])/g;
  let totalMs = 0;
  let match;

  while ((match = regex.exec(timeString)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        totalMs += value * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
    }
  }

  return totalMs;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimeRemaining(endTime) {
  if (!endTime) return 'No expiry';

  const now = new Date();
  const remaining = new Date(endTime) - now;

  if (remaining <= 0) return 'Ended';

  return formatTime(remaining);
}

async function createGiveaway(guildId, channelId, messageId, hostId, hostTag, prize, winners, duration, banner = null, thumbnail = null, options = {}) {
  const {
    type = 'button',
    color = null,
    title = null,
    dropEmoji = null
  } = options;

  let endTime = null;
  if (duration) {
    endTime = new Date(Date.now() + duration);
  }

  const resolvedBanner = isValidUrl(banner) ? banner : DEFAULT_GIVEAWAY_BANNER;
  const resolvedThumbnail = isValidUrl(thumbnail) ? thumbnail : null;

  const giveaway = await Giveaway.create({
    guildId,
    channelId,
    messageId,
    hostId,
    hostTag,
    prize,
    winners,
    endTime,
    ended: false,
    endedAt: null,
    paused: false,
    pausedAt: null,
    type,
    dropEmoji: type === 'drop' ? (dropEmoji || DEFAULT_DROP_EMOJI) : null,
    color: Number.isInteger(color) ? color : DEFAULT_GIVEAWAY_COLOR,
    title: (typeof title === 'string' && title.trim()) ? title.trim() : null,
    participants: [],
    winnerIds: [],
    banner: resolvedBanner,
    thumbnail: resolvedThumbnail
  });

  return giveaway;
}

async function addParticipant(messageId, userId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  if (giveaway.paused) {
    return { paused: true, giveaway };
  }

  if (giveaway.type === 'drop') {
    return { dropOnly: true, giveaway };
  }

  if (giveaway.participants.includes(userId)) {
    return { alreadyEntered: true, giveaway };
  }

  giveaway.participants.push(userId);
  await giveaway.save();

  return { alreadyEntered: false, giveaway };
}

async function removeParticipant(messageId, userId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  if (giveaway.paused) {
    return { paused: true, giveaway };
  }

  const index = giveaway.participants.indexOf(userId);
  if (index === -1) {
    return { wasParticipant: false, giveaway };
  }

  giveaway.participants.splice(index, 1);
  await giveaway.save();

  return { wasParticipant: true, giveaway };
}

async function claimDrop(messageId, userId) {
  const giveaway = await Giveaway.findOneAndUpdate(
    { messageId, ended: false, paused: { $ne: true }, type: 'drop' },
    {
      $set: {
        ended: true,
        endedAt: new Date(),
        participants: [userId],
        winnerIds: [userId]
      }
    },
    { new: true }
  );

  return giveaway;
}

async function endGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  const participants = [...(giveaway.participants || [])];
  const noParticipants = participants.length === 0;
  const winnerCount = noParticipants ? 0 : Math.min(giveaway.winners, participants.length);
  const winners = [];

  for (let i = 0; i < winnerCount; i++) {
    const randomIndex = Math.floor(Math.random() * participants.length);
    winners.push(participants[randomIndex]);
    participants.splice(randomIndex, 1);
  }

  giveaway.ended = true;
  giveaway.endedAt = new Date();
  giveaway.winnerIds = winners;
  await giveaway.save();

  return { giveaway, winners, noParticipants };
}

async function rerollGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: true });

  if (!giveaway) return null;

  const allParticipants = giveaway.participants || [];
  const allWinners = giveaway.winnerIds || [];
  if (allParticipants.length === 0) {
    return { giveaway, newWinners: [], noParticipants: true };
  }

  const eligibleParticipants = allParticipants.filter(
    p => !allWinners.includes(p)
  );

  if (eligibleParticipants.length === 0) {
    return { giveaway, newWinners: [] };
  }

  const winnerCount = Math.min(giveaway.winners, eligibleParticipants.length);
  const newWinners = [];

  const participants = [...eligibleParticipants];
  for (let i = 0; i < winnerCount; i++) {
    const randomIndex = Math.floor(Math.random() * participants.length);
    newWinners.push(participants[randomIndex]);
    participants.splice(randomIndex, 1);
  }

  giveaway.winnerIds = newWinners;
  await giveaway.save();

  return { giveaway, newWinners };
}

async function pauseGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  if (giveaway.paused) {
    return { alreadyPaused: true, giveaway };
  }

  giveaway.paused = true;
  giveaway.pausedAt = new Date();
  await giveaway.save();

  return { giveaway };
}

async function resumeGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  if (!giveaway.paused) {
    return { alreadyResumed: true, giveaway };
  }

  if (giveaway.endTime) {
    const pausedAt = giveaway.pausedAt
      ? new Date(giveaway.pausedAt).getTime()
      : Date.now();
    const remaining = Math.max(0, new Date(giveaway.endTime).getTime() - pausedAt);
    giveaway.endTime = new Date(Date.now() + remaining);
  }

  giveaway.paused = false;
  giveaway.pausedAt = null;
  await giveaway.save();

  return { giveaway };
}

async function updateGiveaway(messageId, updates = {}) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  if (updates.prize !== undefined) giveaway.prize = updates.prize;
  if (updates.winners !== undefined) giveaway.winners = updates.winners;
  if (updates.banner !== undefined) giveaway.banner = updates.banner;
  if (updates.thumbnail !== undefined) giveaway.thumbnail = updates.thumbnail;
  if (updates.color !== undefined) giveaway.color = updates.color;

  if (updates.duration !== undefined) {
    giveaway.endTime = new Date(Date.now() + updates.duration);
    if (giveaway.paused) {
      giveaway.pausedAt = new Date();
    }
  } else if (updates.endTime !== undefined) {
    giveaway.endTime = updates.endTime;
  }

  await giveaway.save();
  return giveaway;
}

async function getActiveGiveaways(guildId) {
  return await Giveaway.find({ guildId, ended: false }).sort({ endTime: 1 });
}

async function getEndedGiveaways(guildId, limit = 10) {
  return await Giveaway.find({ guildId, ended: true })
    .sort({ endedAt: -1, endTime: -1 })
    .limit(limit);
}

async function getGiveawayByMessageId(messageId) {
  return await Giveaway.findOne({ messageId });
}

async function deleteGiveaway(messageId) {
  const result = await Giveaway.deleteOne({ messageId });
  return result.deletedCount > 0;
}

async function getGiveawayConfig(guildId) {
  const config = await GiveawayConfig.findOne({ guildId });

  // Migrate legacy thumbnail (gift gif) -> none.
  let thumbnail = config?.thumbnail ?? null;
  if (thumbnail === OLD_GIFT_THUMBNAIL) thumbnail = null;

  return {
    banner: config?.banner || DEFAULT_GIVEAWAY_BANNER,
    thumbnail,
    color: config?.color ?? DEFAULT_GIVEAWAY_COLOR,
    title: config?.title || null,
    isCustom: Boolean(config)
  };
}

async function updateGiveawayConfig(guildId, updates = {}) {
  return await GiveawayConfig.findOneAndUpdate(
    { guildId },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function resetGiveawayConfig(guildId) {
  const result = await GiveawayConfig.deleteOne({ guildId });
  return result.deletedCount > 0;
}

function getGiveawayAttachmentFiles(container) {
  try {
    const json = typeof container?.toJSON === 'function' ? container.toJSON() : null;
    const text = JSON.stringify(json || {});
    if (!text.includes(`attachment://${GLOW_IMAGE_FILENAME}`)) return [];
    if (!fs.existsSync(GLOW_IMAGE_PATH)) return [];
    const buffer = fs.readFileSync(GLOW_IMAGE_PATH);
    return [new AttachmentBuilder(buffer, { name: GLOW_IMAGE_FILENAME })];
  } catch {
    return [];
  }
}

function buildGiveawayPayload(container) {
  const files = getGiveawayAttachmentFiles(container);
  const payload = {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
  if (files.length > 0) payload.files = files;
  return payload;
}

async function sendGiveawayMessage(channel, container) {
  return await channel.send(buildGiveawayPayload(container));
}

module.exports = {
  DEFAULT_GIFT_THUMBNAIL,
  DEFAULT_GIVEAWAY_BANNER,
  DEFAULT_GIVEAWAY_COLOR,
  DEFAULT_GIVEAWAY_TITLE,
  DEFAULT_DROP_TITLE,
  DEFAULT_DROP_EMOJI,
  GLOW_IMAGE_FILENAME,
  GLOW_IMAGE_PATH,
  DEFAULT_GLOW_BANNER,
  OLD_GIFT_THUMBNAIL,
  OLD_GIVEAWAY_BANNER,
  isValidUrl,
  parseColor,
  buildGiveawayContainer,
  createGiveaway,
  addParticipant,
  removeParticipant,
  claimDrop,
  endGiveaway,
  rerollGiveaway,
  pauseGiveaway,
  resumeGiveaway,
  updateGiveaway,
  getActiveGiveaways,
  getEndedGiveaways,
  getGiveawayByMessageId,
  deleteGiveaway,
  getGiveawayConfig,
  updateGiveawayConfig,
  resetGiveawayConfig,
  getGiveawayAttachmentFiles,
  buildGiveawayPayload,
  sendGiveawayMessage,
  parseTime,
  formatTime,
  formatTimeRemaining
};
