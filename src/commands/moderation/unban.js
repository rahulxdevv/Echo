const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'unban',
  description: 'Unban a user from the server',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option => 
      option.setName('user')
        .setDescription('The user ID or username to unban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for unbanning')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ content: 'You do not have permission to unban members!', flags: [64] });
    }

    const userIdentifier = args[0];
    if (!userIdentifier) {
      return message.reply({ content: 'Please provide a user ID or username to unban!', flags: [64] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      const bannedUsers = await message.guild.bans.fetch();
      const bannedUser = bannedUsers.find(ban => 
        ban.user.id === userIdentifier || 
        ban.user.tag.toLowerCase().includes(userIdentifier.toLowerCase())
      );

      if (!bannedUser) {
        return message.reply({ content: 'Could not find a banned user with that identifier!', flags: [64] });
      }

      await message.guild.bans.remove(bannedUser.user, reason);
      await message.reply({ content: `✅ Successfully unbanned ${bannedUser.user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Unban error:', error);
      await message.reply({ content: 'There was an error trying to unban that user!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const userIdentifier = interaction.options.getString('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const bannedUsers = await interaction.guild.bans.fetch();
      const bannedUser = bannedUsers.find(ban => 
        ban.user.id === userIdentifier || 
        ban.user.tag.toLowerCase().includes(userIdentifier.toLowerCase())
      );

      if (!bannedUser) {
        return interaction.reply({ content: 'Could not find a banned user with that identifier!', flags: [64] });
      }

      await interaction.guild.bans.remove(bannedUser.user, reason);
      await interaction.reply({ content: `✅ Successfully unbanned ${bannedUser.user.tag} for: ${reason}` });
    } catch (error) {
      console.error('Unban error:', error);
      await interaction.reply({ content: 'There was an error trying to unban that user!', flags: [64] });
    }
  }
};

