const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Moderation',
  name: 'ban',
  description: 'Ban a user from the server',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for banning')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ content: 'You do not have permission to ban members!', flags: [64] });
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ content: 'Please mention a user to ban!', flags: [64] });
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.bannable) {
      return message.reply({ content: 'I cannot ban this user!', flags: [64] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.ban({ reason });
      await message.reply({ content: `${emojis.status.success} Successfully banned ${user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Ban error:', error);
      await message.reply({ content: 'There was an error trying to ban that user!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.bannable) {
      return interaction.reply({ content: 'I cannot ban this user!', flags: [64] });
    }

    try {
      await member.ban({ reason });
      await interaction.reply({ content: `${emojis.status.success} Successfully banned ${user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Ban error:', error);
      await interaction.reply({ content: 'There was an error trying to ban that user!', flags: [64] });
    }
  }
};

