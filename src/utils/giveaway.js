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
  ButtonStyle
} = require('discord.js');
const Giveaway = require('../models/Giveaway');

const DEFAULT_GIFT_THUMBNAIL = process.env.GIVEAWAY_THUMBNAIL_URL || 'https://media.tenor.com/t7aI5VVWTvwAAAAC/gift-christmas-gift.gif';
const DEFAULT_GIVEAWAY_BANNER = process.env.GIVEAWAY_BANNER_URL || 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif';

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildGiveawayContainer({
  prize,
  winners = 1,
  endTime,
  hostId,
  participantsCount = 0,
  isEnded = false,
  isReroll = false,
  winnerText = null,
  banner = null,
  thumbnail = null
}) {
  const container = new ContainerBuilder();

  const bannerUrl = isValidUrl(banner) ? banner : DEFAULT_GIVEAWAY_BANNER;
  if (bannerUrl) {
    const mediaGallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(bannerUrl)
    );
    container.addMediaGalleryComponents(mediaGallery);
  }

  let content = '';
  if (isEnded) {
    const title = isReroll ? '# 🎁 Giveaway Ended (Rerolled)' : '# 🎁 Giveaway Ended';
    const displayWinners = winnerText || 'No valid participants!';
    content = `${title}\n\n` +
      `**Prize:** ${prize}\n` +
      `**Winners:** ${displayWinners}\n` +
      `**Hosted by:** <@${hostId}>\n\n` +
      `**Total Participants:** ${participantsCount}`;
  } else {
    const endTimestamp = endTime instanceof Date
      ? Math.floor(endTime.getTime() / 1000)
      : Math.floor(new Date(endTime || Date.now()).getTime() / 1000);

    content = `# 🎉 Giveaway\n\n` +
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winners}\n` +
      `**Ends:** <t:${endTimestamp}:R>\n` +
      `**Hosted by:** <@${hostId}>\n` +
      `**Participants:** ${participantsCount}`;
  }

  const textDisplay = new TextDisplayBuilder().setContent(content);

  const thumbnailUrl = isValidUrl(thumbnail) ? thumbnail : DEFAULT_GIFT_THUMBNAIL;
  if (thumbnailUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(textDisplay)
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(textDisplay);
  }

  if (!isEnded) {
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);

    const button = new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel('Enter Giveaway')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary);

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
  const now = new Date();
  const remaining = endTime - now;

  if (remaining <= 0) return 'Ended';

  return formatTime(remaining);
}

async function createGiveaway(guildId, channelId, messageId, hostId, hostTag, prize, winners, duration, banner = null, thumbnail = null) {
  const endTime = new Date(Date.now() + duration);

  const giveaway = await Giveaway.create({
    guildId,
    channelId,
    messageId,
    hostId,
    hostTag,
    prize,
    winners,
    endTime,
    participants: [],
    winnerIds: [],
    banner: isValidUrl(banner) ? banner : DEFAULT_GIVEAWAY_BANNER,
    thumbnail: isValidUrl(thumbnail) ? thumbnail : DEFAULT_GIFT_THUMBNAIL,
    ended: false
  });

  return giveaway;
}

async function addParticipant(messageId, userId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

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

  const index = giveaway.participants.indexOf(userId);
  if (index === -1) {
    return { wasParticipant: false, giveaway };
  }

  giveaway.participants.splice(index, 1);
  await giveaway.save();

  return { wasParticipant: true, giveaway };
}

async function endGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: false });

  if (!giveaway) return null;

  const participants = [...giveaway.participants];
  const winnerCount = Math.min(giveaway.winners, participants.length);
  const winners = [];

  for (let i = 0; i < winnerCount; i++) {
    const randomIndex = Math.floor(Math.random() * participants.length);
    winners.push(participants[randomIndex]);
    participants.splice(randomIndex, 1);
  }

  giveaway.ended = true;
  giveaway.winnerIds = winners;
  await giveaway.save();

  return { giveaway, winners };
}

async function rerollGiveaway(messageId) {
  const giveaway = await Giveaway.findOne({ messageId, ended: true });

  if (!giveaway) return null;

  const eligibleParticipants = giveaway.participants.filter(
    p => !giveaway.winnerIds.includes(p)
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

async function getActiveGiveaways(guildId) {
  return await Giveaway.find({ guildId, ended: false }).sort({ endTime: 1 });
}

async function getEndedGiveaways(guildId, limit = 10) {
  return await Giveaway.find({ guildId, ended: true })
    .sort({ endTime: -1 })
    .limit(limit);
}

async function getGiveawayByMessageId(messageId) {
  return await Giveaway.findOne({ messageId });
}

async function deleteGiveaway(messageId) {
  const result = await Giveaway.deleteOne({ messageId });
  return result.deletedCount > 0;
}

module.exports = {
  DEFAULT_GIFT_THUMBNAIL,
  DEFAULT_GIVEAWAY_BANNER,
  isValidUrl,
  buildGiveawayContainer,
  parseTime,
  formatTime,
  formatTimeRemaining,
  createGiveaway,
  addParticipant,
  removeParticipant,
  endGiveaway,
  rerollGiveaway,
  getActiveGiveaways,
  getEndedGiveaways,
  getGiveawayByMessageId,
  deleteGiveaway
};
