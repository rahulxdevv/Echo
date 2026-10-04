const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'unlock',
  description: 'Unlock the channel to allow sending messages',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the channel to allow sending messages')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for unlocking the channel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ content: 'You do not have permission to manage channels!', flags: [64] });
    }

    const reason = args.join(' ') || 'No reason provided';

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null
      });

      await message.reply({ content: `🔓 Channel has been unlocked. Reason: ${reason}` });
    } catch (error) {
      console.error('Unlock error:', error);
      await message.reply({ content: 'There was an error unlocking the channel!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      });

      await interaction.reply({ content: `🔓 Channel has been unlocked. Reason: ${reason}` });
    } catch (error) {
      console.error('Unlock error:', error);
      await interaction.reply({ content: 'There was an error unlocking the channel!', flags: [64] });
    }
  }
};

