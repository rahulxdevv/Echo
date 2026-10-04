const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Moderation',
  name: 'kick',
  description: 'Kick a user from the server',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for kicking')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply({ content: 'You do not have permission to kick members!', flags: [64] });
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ content: 'Please mention a user to kick!', flags: [64] });
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.kickable) {
      return message.reply({ content: 'I cannot kick this user!', flags: [64] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.kick(reason);
      await message.reply({ content: `${emojis.status.success} Successfully kicked ${user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Kick error:', error);
      await message.reply({ content: 'There was an error trying to kick that user!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.kickable) {
      return interaction.reply({ content: 'I cannot kick this user!', flags: [64] });
    }

    try {
      await member.kick(reason);
      await interaction.reply({ content: `${emojis.status.success} Successfully kicked ${user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Kick error:', error);
      await interaction.reply({ content: 'There was an error trying to kick that user!', flags: [64] });
    }
  }
};

