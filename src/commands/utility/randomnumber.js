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
  name: 'randomnumber',
  description: 'Generate a random number',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('randomnumber')
    .setDescription('Generate a random number')
    .addIntegerOption(option =>
      option
        .setName('min')
        .setDescription('Minimum number (default: 1)')
        .setRequired(false))
    .addIntegerOption(option =>
      option
        .setName('max')
        .setDescription('Maximum number (default: 100)')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    const min = parseInt(args[0]) || 1;
    const max = parseInt(args[1]) || 100;

    if (min >= max) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Minimum must be less than maximum!\nUsage: \`!randomnumber [min] [max]\`\nExample: \`!randomnumber 1 100\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await message.reply(createRandomNumberPayload(min, max));
  },

  async executeSlash(interaction, client) {
    const min = interaction.options.getInteger('min') || 1;
    const max = interaction.options.getInteger('max') || 100;

    if (min >= max) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Minimum must be less than maximum!`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await interaction.reply(createRandomNumberPayload(min, max));
  }
};

function createRandomNumberPayload(min, max) {
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;

  let randomText = `# ${emojis.common.dice} Random Number\n\n`;
  randomText += `**Range:** ${min} - ${max}\n`;
  randomText += `**Result:** **${randomNum}**`;

  const textDisplay = new TextDisplayBuilder().setContent(randomText);

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
