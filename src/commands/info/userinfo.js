const { SlashCommandBuilder } = require('discord.js');
const { replyWithCard } = require('../../utils/respond');

function getTopRoles(member) {
  if (!member) {
    return 'No server profile found.';
  }

  const roles = member.roles.cache
    .filter((role) => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .first(4);

  if (!roles.length) {
    return 'No highlighted roles.';
  }

  return roles.map((role) => role.toString()).join(', ');
}

function getMemberBadges(member) {
  if (!member) {
    return 'None';
  }

  const badges = [];
  if (member.permissions.has('Administrator')) badges.push('Administrator');
  if (member.permissions.has('ManageGuild')) badges.push('Server Manager');
  if (member.premiumSinceTimestamp) badges.push('Booster');
  if (member.user.bot) badges.push('Bot');

  return badges.length ? badges.join(' • ') : 'None';
}

async function buildUserCard(guild, user) {
  const member = await guild.members.fetch(user.id).catch(() => null);
  const accentRole = member?.displayHexColor && member.displayHexColor !== '#000000'
    ? member.displayHexColor
    : 'Default';

  return {
    title: user.tag,
    description: [
      `A profile summary for ${user.toString()}.`,
      `User ID: \`${user.id}\``,
    ].join('\n'),
    thumbnail: {
      url: user.displayAvatarURL({ dynamic: true, size: 512 }),
    },
    fields: [
      {
        name: 'Account',
        value: [
          `Created: <t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
          `Bot Account: ${user.bot ? 'Yes' : 'No'}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: 'Server Profile',
        value: member
          ? [
              `Joined: <t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
              `Nickname: ${member.nickname || 'None'}`,
              `Accent Role: ${accentRole}`,
            ].join('\n')
          : 'This user is not available in the guild member cache right now.',
        inline: false,
      },
      {
        name: 'Highlights',
        value: [
          `Badges: ${getMemberBadges(member)}`,
          `Top Roles: ${getTopRoles(member)}`,
        ].join('\n'),
        inline: false,
      },
    ],
    footer: {
      text: member ? `Display name: ${member.displayName}` : 'User profile lookup',
    },
  };
}

module.exports = {
  category: 'Info',
  name: 'userinfo',
  description: 'Get information about a user',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The user to get info about')
        .setRequired(false)),

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    await replyWithCard(message, await buildUserCard(message.guild, user));
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    await replyWithCard(interaction, await buildUserCard(interaction.guild, user));
  },
};
