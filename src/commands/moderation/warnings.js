const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../../models/Warning');
const { replyWithCard } = require('../../utils/respond');

async function getWarningsForMember(guildId, userId) {
  return Warning.find({ guildId, userId }).sort({ createdAt: -1 }).lean();
}

function createWarningsCard(user, warnings) {
  return {
    color: 0xff9800,
    title: `Warnings for ${user.tag}`,
    description: `Total warnings: ${warnings.length}`,
    fields: warnings.map((warning, index) => ({
      name: `Warning #${index + 1}`,
      value: `**Reason:** ${warning.reason}\n**Date:** <t:${Math.floor(new Date(warning.createdAt).getTime() / 1000)}:F>\n**Moderator:** <@${warning.moderatorId}>`,
      inline: false,
    })),
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  category: 'Moderation',
  name: 'warnings',
  description: 'Check warnings for a user',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings for a user')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to check warnings for')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    const warnings = await getWarningsForMember(message.guild.id, user.id);

    if (!warnings.length) {
      return message.reply({ content: `${user.tag} has no warnings.` });
    }

    await replyWithCard(message, createWarningsCard(user, warnings));
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const warnings = await getWarningsForMember(interaction.guild.id, user.id);

    if (!warnings.length) {
      return interaction.reply({ content: `${user.tag} has no warnings.` });
    }

    await replyWithCard(interaction, createWarningsCard(user, warnings));
  },
};


