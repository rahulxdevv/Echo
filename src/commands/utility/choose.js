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
  name: 'choose',
  description: 'Choose randomly from given options',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose randomly from given options')
    .addStringOption(option =>
      option
        .setName('options')
        .setDescription('Options separated by commas (e.g., pizza, burger, sushi)')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    if (args.length === 0) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!choose <option1>, <option2>, <option3>...\`\nExample: \`!choose pizza, burger, sushi\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const input = args.join(' ');
    await message.reply(createChoicePayload(input));
  },

  async executeSlash(interaction, client) {
    const input = interaction.options.getString('options');
    await interaction.reply(createChoicePayload(input));
  }
};

function createChoicePayload(input) {
  const options = input.split(',').map(opt => opt.trim()).filter(opt => opt);

  if (options.length < 2) {
    const errorText = new TextDisplayBuilder()
      .setContent(`${emojis.status.warning} Please provide at least 2 options separated by commas!`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(errorText);

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  }

  const choice = options[Math.floor(Math.random() * options.length)];

  let choiceText = `# ${emojis.common.dice} Random Choice\n\n`;
  choiceText += `**Options:**\n`;
  options.forEach((opt, i) => {
    choiceText += `${i + 1}. ${opt}\n`;
  });
  choiceText += `\n**I choose:** **${choice}**`;

  const textDisplay = new TextDisplayBuilder().setContent(choiceText);

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
