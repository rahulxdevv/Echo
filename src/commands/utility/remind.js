const { SlashCommandBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Utility',
  name: 'remind',
  description: 'Set a reminder',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(option => 
      option.setName('time')
        .setDescription('Time duration (e.g., 1m, 1h, 1d)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('What to remind you about')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const timeInput = args[0];
    const reminderText = args.slice(1).join(' ');

    if (!timeInput || !reminderText) {
      return message.reply({ content: 'Usage: !remind <time> <message>\nExample: !remind 1m Check my email', flags: [64] });
    }

    const time = parseTime(timeInput);
    if (!time) {
      return message.reply({ content: 'Invalid time format! Use: 1s, 1m, 1h, 1d', flags: [64] });
    }

    await message.reply({ content: `${emojis.status.clock} I'll remind you about "${reminderText}" in ${timeInput}` });

    setTimeout(() => {
      message.author.send({ 
        content: `${emojis.status.clock} **Reminder:** ${reminderText}` 
      }).catch(() => {
        message.channel.send({ 
          content: `${emojis.status.clock} **Reminder for ${message.author}:** ${reminderText}` 
        });
      });
    }, time);
  },

  async executeSlash(interaction) {
    const timeInput = interaction.options.getString('time');
    const reminderText = interaction.options.getString('message');

    const time = parseTime(timeInput);
    if (!time) {
      return interaction.reply({ content: 'Invalid time format! Use: 1s, 1m, 1h, 1d', flags: [64] });
    }

    await interaction.reply({ content: `${emojis.status.clock} I'll remind you about "${reminderText}" in ${timeInput}` });

    setTimeout(() => {
      interaction.user.send({ 
        content: `${emojis.status.clock} **Reminder:** ${reminderText}` 
      }).catch(() => {
        interaction.channel.send({ 
          content: `${emojis.status.clock} **Reminder for ${interaction.user}:** ${reminderText}` 
        });
      });
    }, time);
  }
};

function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/);
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

