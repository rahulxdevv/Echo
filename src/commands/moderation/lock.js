const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'lock',
  description: 'Lock the channel to prevent sending messages',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the channel to prevent sending messages')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ content: 'You do not have permission to manage channels!', flags: [64] });
    }

    const reason = args.join(' ') || 'No reason provided';

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });

      await message.reply({ content: `🔒 Channel has been locked. Reason: ${reason}` });
    } catch (error) {
      console.error('Lock error:', error);
      await message.reply({ content: 'There was an error locking the channel!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });

      await interaction.reply({ content: `🔒 Channel has been locked. Reason: ${reason}` });
    } catch (error) {
      console.error('Lock error:', error);
      await interaction.reply({ content: 'There was an error locking the channel!', flags: [64] });
    }
  }
};

