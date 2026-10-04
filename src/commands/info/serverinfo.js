const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { replyWithCard } = require('../../utils/respond');

function getChannelStats(guild) {
  const channels = guild.channels.cache;

  return {
    text: channels.filter((channel) => channel.type === ChannelType.GuildText).size,
    voice: channels.filter((channel) => channel.type === ChannelType.GuildVoice).size,
    categories: channels.filter((channel) => channel.type === ChannelType.GuildCategory).size,
    forums: channels.filter((channel) => channel.type === ChannelType.GuildForum).size,
  };
}

function getMemberStats(guild) {
  const members = guild.members.cache;

  return {
    humans: members.filter((member) => !member.user.bot).size,
    bots: members.filter((member) => member.user.bot).size,
  };
}

async function buildServerCard(guild) {
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = getChannelStats(guild);
  const members = getMemberStats(guild);

  return {
    title: guild.name,
    description: [
      `A quick server snapshot for **${guild.name}**.`,
      `Server ID: \`${guild.id}\``,
    ].join('\n'),
    thumbnail: guild.iconURL({ dynamic: true, size: 512 })
      ? { url: guild.iconURL({ dynamic: true, size: 512 }) }
      : undefined,
    fields: [
      {
        name: 'Community',
        value: [
          `Owner: ${owner ? `<@${owner.id}>` : 'Unknown'}`,
          `Members: **${guild.memberCount.toLocaleString()}**`,
          `Humans / Bots: **${members.humans}** / **${members.bots}**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Channels',
        value: [
          `Text: **${channels.text}**`,
          `Voice: **${channels.voice}**`,
          `Categories: **${channels.categories}**`,
          `Forums: **${channels.forums}**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Server Setup',
        value: [
          `Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
          `Roles: **${guild.roles.cache.size}**`,
          `Boosts: **${guild.premiumSubscriptionCount || 0}**`,
          `Boost Tier: **Level ${guild.premiumTier}**`,
        ].join('\n'),
        inline: false,
      },
    ],
    footer: {
      text: `Verification: ${guild.verificationLevel} • NSFW: ${guild.nsfwLevel}`,
    },
  };
}

module.exports = {
  category: 'Info',
  name: 'serverinfo',
  description: 'Get information about the server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get information about the server'),

  async executePrefix(message) {
    await replyWithCard(message, await buildServerCard(message.guild));
  },

  async executeSlash(interaction) {
    await replyWithCard(interaction, await buildServerCard(interaction.guild));
  },
};
