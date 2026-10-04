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
  name: 'calculate',
  description: 'Perform a calculation',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('calculate')
    .setDescription('Perform a calculation')
    .addStringOption(option =>
      option
        .setName('expression')
        .setDescription('The math expression to calculate (e.g., 2 + 2, 10 * 5)')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const expression = args.join(' ');

    if (!expression) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!calculate <expression>\`\nExample: \`!calculate 2 + 2\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await message.reply(calculateExpression(expression));
  },

  async executeSlash(interaction, client) {
    const expression = interaction.options.getString('expression');
    await interaction.reply(calculateExpression(expression));
  }
};

function calculateExpression(expression) {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');

    if (!sanitized || sanitized.trim() === '') {
      throw new Error('Invalid expression');
    }

    const result = Function('"use strict"; return (' + sanitized + ')')();

    if (!isFinite(result)) {
      throw new Error('Result is not a finite number');
    }

    let resultText = `# ${emojis.common.calculator} Calculator\n\n`;
    resultText += `**Expression:** \`${expression}\`\n`;
    resultText += `**Result:** \`${result}\``;

    const textDisplay = new TextDisplayBuilder().setContent(resultText);

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
  } catch (error) {
    const errorText = new TextDisplayBuilder()
      .setContent(`${emojis.status.warning} **Error:** Invalid expression. Please use only numbers and operators (+, -, *, /, parentheses).`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(errorText);

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  }
}
