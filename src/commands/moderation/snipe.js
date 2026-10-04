const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const emojis = require('../../utils/emojis');

// Use the same global cache as the messageDelete event
if (!global._snipeCache) global._snipeCache = new Map();
const snipeCache = global._snipeCache;

module.exports = {
  category: 'Moderation',
  name: 'snipe',
  description: 'Show the last deleted message in this channel',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the last deleted message in this channel'),

  async executePrefix(message, args, client) {
    await message.reply(buildPayload(message.channel.id));
  },

  async executeSlash(interaction, client) {
    await interaction.reply(buildPayload(interaction.channel.id));
  },
};

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function buildPayload(channelId) {
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

  const snipe = snipeCache.get(channelId);

  if (!snipe) {
    return {
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `${emojis.status.search} **Snipe**\n\nNo deleted messages found in this channel.\n*Either nothing was deleted recently, or the message was sent by a bot.*`
          ))
          .addSeparatorComponents(sep),
      ],
    };
  }

  const header = [
    `${emojis.status.search} **Sniped Message**`,
    ``,
    `**Author:** ${snipe.author}${snipe.authorId ? ` (<@${snipe.authorId}>)` : ''}`,
    `**Sent at:** ${formatTimestamp(snipe.timestamp)}`,
    `**Deleted:** ${timeAgo(snipe.deletedAt)}`,
  ].join('\n');

  const contentBlock = snipe.content
    ? `\n\n**Message:**\n>>> ${snipe.content}`
    : `\n\n*This message had no text content.*`;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header + contentBlock))
    .addSeparatorComponents(sep);

  // If there was an attachment image, show it in a gallery
  if (snipe.attachment) {
    const gallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(snipe.attachment)
    );
    container.addMediaGalleryComponents(gallery);
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
