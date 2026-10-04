const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Utility',
  name: 'uptime',
  description: 'Check bot uptime',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Check bot uptime'),

  async executePrefix(message, args, client) {
    await message.reply(createUptimePayload(client));
  },

  async executeSlash(interaction, client) {
    await interaction.reply(createUptimePayload(client));
  }
};

function createUptimePayload(client) {
  const uptime = client.uptime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor(uptime / 3600000) % 24;
  const minutes = Math.floor(uptime / 60000) % 60;
  const seconds = Math.floor(uptime / 1000) % 60;

  let uptimeText = `# ${emojis.status.wait} Bot Uptime\n\n`;
  uptimeText += `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s\n`;
  uptimeText += `**Total Milliseconds:** ${uptime}ms\n`;
  uptimeText += `**Started:** <t:${Math.floor((Date.now() - uptime) / 1000)}:R>`;

  const textDisplay = new TextDisplayBuilder().setContent(uptimeText);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
