const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'timeout',
  description: 'Timeout a user for a specified duration',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user for a specified duration')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Timeout duration (e.g., 1m, 1h, 1d)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ content: 'You do not have permission to timeout members!', flags: [64] });
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ content: 'Please mention a user to timeout!', flags: [64] });
    }

    const duration = args[1];
    if (!duration) {
      return message.reply({ content: 'Please specify a duration (e.g., 1m, 1h, 1d)!', flags: [64] });
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.moderatable) {
      return message.reply({ content: 'I cannot timeout this user!', flags: [64] });
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';
    const timeoutDuration = parseDuration(duration);

    if (!timeoutDuration) {
      return message.reply({ content: 'Invalid duration! Use: 1s, 1m, 1h, 1d', flags: [64] });
    }

    try {
      await member.timeout(timeoutDuration, reason);
      await message.reply({ content: `✅ Successfully timed out ${user.tag} for ${duration} - ${reason}` });
    } catch (error) {
      console.error('Timeout error:', error);
      await message.reply({ content: 'There was an error trying to timeout that user!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: 'I cannot timeout this user!', flags: [64] });
    }

    const timeoutDuration = parseDuration(duration);

    if (!timeoutDuration) {
      return interaction.reply({ content: 'Invalid duration! Use: 1s, 1m, 1h, 1d', flags: [64] });
    }

    try {
      await member.timeout(timeoutDuration, reason);
      await interaction.reply({ content: `✅ Successfully timed out ${user.tag} for ${duration} - ${reason}` });
    } catch (error) {
      console.error('Timeout error:', error);
      await interaction.reply({ content: 'There was an error trying to timeout that user!', flags: [64] });
    }
  }
};

function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const [, amount, unit] = match;
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return parseInt(amount) * multipliers[unit];
}

