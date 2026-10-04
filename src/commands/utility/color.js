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
  name: 'color',
  description: 'Get information about a color',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Get information about a color')
    .addStringOption(option =>
      option
        .setName('hex')
        .setDescription('Hex color code (e.g., #FF0000 or FF0000)')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    if (args.length === 0) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!color <hex>\`\nExample: \`!color #FF0000\` or \`!color FF0000\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const hex = args[0];
    await message.reply(createColorPayload(hex));
  },

  async executeSlash(interaction, client) {
    const hex = interaction.options.getString('hex');
    await interaction.reply(createColorPayload(hex));
  }
};

function createColorPayload(hexInput) {
  let hex = hexInput.replace('#', '').toUpperCase();

  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    const errorText = new TextDisplayBuilder()
      .setContent(`${emojis.status.warning} Invalid hex color! Use format: \`#FF0000\` or \`FF0000\``);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(errorText);

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  let colorText = `# ${emojis.media.paint} Color Information\n\n`;
  colorText += `**Hex:** #${hex}\n`;
  colorText += `**RGB:** rgb(${r}, ${g}, ${b})\n`;
  colorText += `**Decimal:** ${parseInt(hex, 16)}\n`;
  colorText += `**Red:** ${r}\n`;
  colorText += `**Green:** ${g}\n`;
  colorText += `**Blue:** ${b}\n`;

  const textDisplay = new TextDisplayBuilder().setContent(colorText);

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
