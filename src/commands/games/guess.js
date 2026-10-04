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
  category: 'Games',
  name: 'guess',
  description: 'Guess a number between 1 and 100',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Guess a number between 1 and 100')
    .addIntegerOption(option =>
      option
        .setName('number')
        .setDescription('Your guess (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  async executePrefix(message, args, client) {
    const guess = parseInt(args[0]);

    if (!guess || guess < 1 || guess > 100) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!guess <number>\`\nExample: \`!guess 50\`\nNumber must be between 1 and 100`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await message.reply(createGuessPayload(guess));
  },

  async executeSlash(interaction, client) {
    const guess = interaction.options.getInteger('number');
    await interaction.reply(createGuessPayload(guess));
  }
};

function createGuessPayload(guess) {
  const target = Math.floor(Math.random() * 100) + 1;
  const difference = Math.abs(target - guess);

  let result;
  if (guess === target) {
    result = `${emojis.status.celebration} **Perfect!** You guessed it exactly!`;
  } else if (difference <= 5) {
    result = `${emojis.status.fire} **Very close!** You were within 5!`;
  } else if (difference <= 10) {
    result = `${emojis.status.success} **Close!** You were within 10!`;
  } else if (difference <= 20) {
    result = `${emojis.status.neutral} **Not bad!** You were within 20!`;
  } else {
    result = `${emojis.common.cross} **Far off!** Better luck next time!`;
  }

  let guessText = `# ${emojis.common.dice} Number Guessing Game\n\n`;
  guessText += `**Your guess:** ${guess}\n`;
  guessText += `**Target number:** ${target}\n`;
  guessText += `**Difference:** ${difference}\n\n`;
  guessText += result;

  const textDisplay = new TextDisplayBuilder().setContent(guessText);

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
