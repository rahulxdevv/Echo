const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'nickname',
  description: 'Change a user\'s nickname',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change a user\'s nickname')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to change nickname for')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('nickname')
        .setDescription('The new nickname (use "reset" to remove)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ content: 'You do not have permission to manage nicknames!', flags: [64] });
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({ content: 'Please mention a user!', flags: [64] });
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) {
      return message.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.manageable) {
      return message.reply({ content: 'I cannot change this user\'s nickname!', flags: [64] });
    }

    const nickname = args.slice(1).join(' ');

    try {
      if (nickname === 'reset') {
        await member.setNickname(null);
        await message.reply({ content: `✅ Reset ${user.tag}'s nickname` });
      } else if (nickname) {
        await member.setNickname(nickname);
        await message.reply({ content: `✅ Changed ${user.tag}'s nickname to: **${nickname}**` });
      } else {
        await message.reply({ content: 'Please provide a nickname or use "reset" to remove it!', flags: [64] });
      }
    } catch (error) {
      console.error('Nickname error:', error);
      await message.reply({ content: 'There was an error changing the nickname!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');

    const member = interaction.guild.members.cache.get(user.id);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server!', flags: [64] });
    }

    if (!member.manageable) {
      return interaction.reply({ content: 'I cannot change this user\'s nickname!', flags: [64] });
    }

    try {
      if (nickname === 'reset') {
        await member.setNickname(null);
        await interaction.reply({ content: `✅ Reset ${user.tag}'s nickname` });
      } else if (nickname) {
        await member.setNickname(nickname);
        await interaction.reply({ content: `✅ Changed ${user.tag}'s nickname to: **${nickname}**` });
      } else {
        await interaction.reply({ content: 'Please provide a nickname!', flags: [64] });
      }
    } catch (error) {
      console.error('Nickname error:', error);
      await interaction.reply({ content: 'There was an error changing the nickname!', flags: [64] });
    }
  }
};

