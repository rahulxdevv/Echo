const { SlashCommandBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Utility',
  name: 'ping',
  description: 'Check the bot latency',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot latency'),
  async executePrefix(message, args, client) {
    const sent = await message.reply('Pinging...');
    const timeDiff = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`${emojis.common.ping} Pong! Latency: ${timeDiff}ms`);
  },
  async executeSlash(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`${emojis.common.ping} Pong! Latency: ${timeDiff}ms`);
  }
};

