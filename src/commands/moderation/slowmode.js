const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'slowmode',
  description: 'Set slowmode for the channel',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for the channel')
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Slowmode duration (e.g., 5s, 1m, off)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply({ content: 'You do not have permission to manage channels!', flags: [64] });
    }

    const duration = args[0];
    if (!duration) {
      return message.reply({ content: 'Please specify a duration (e.g., 5s, 1m, off)!', flags: [64] });
    }

    let seconds = 0;

    if (duration.toLowerCase() === 'off') {
      seconds = 0;
    } else {
      const match = duration.match(/^(\d+)([smhd])$/);
      if (!match) {
        return message.reply({ content: 'Invalid duration! Use: 5s, 1m, off', flags: [64] });
      }

      const [, amount, unit] = match;
      const multipliers = {
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 24 * 60 * 60
      };

      seconds = Math.min(parseInt(amount) * multipliers[unit], 21600);
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);
      
      if (seconds === 0) {
        await message.reply({ content: `✅ Slowmode has been disabled in this channel.` });
      } else {
        await message.reply({ content: `✅ Slowmode has been set to ${duration} in this channel.` });
      }
    } catch (error) {
      console.error('Slowmode error:', error);
      await message.reply({ content: 'There was an error setting slowmode!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const duration = interaction.options.getString('duration');
    let seconds = 0;

    if (duration.toLowerCase() === 'off') {
      seconds = 0;
    } else {
      const match = duration.match(/^(\d+)([smhd])$/);
      if (!match) {
        return interaction.reply({ content: 'Invalid duration! Use: 5s, 1m, off', flags: [64] });
      }

      const [, amount, unit] = match;
      const multipliers = {
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 24 * 60 * 60
      };

      seconds = Math.min(parseInt(amount) * multipliers[unit], 21600);
    }

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      
      if (seconds === 0) {
        await interaction.reply({ content: `✅ Slowmode has been disabled in this channel.` });
      } else {
        await interaction.reply({ content: `✅ Slowmode has been set to ${duration} in this channel.` });
      }
    } catch (error) {
      console.error('Slowmode error:', error);
      await interaction.reply({ content: 'There was an error setting slowmode!', flags: [64] });
    }
  }
};

