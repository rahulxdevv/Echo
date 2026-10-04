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
  name: 'dice',
  description: 'Roll dice',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll dice')
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on the dice (default: 6)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100))
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of dice to roll (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),

  async executePrefix(message, args, client) {
    const sides = parseInt(args[0]) || 6;
    const count = parseInt(args[1]) || 1;

    if (sides < 2 || sides > 100) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Sides must be between 2 and 100!`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    if (count < 1 || count > 10) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Count must be between 1 and 10!`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await message.reply(createDicePayload(sides, count));
  },

  async executeSlash(interaction, client) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    await interaction.reply(createDicePayload(sides, count));
  }
};

function createDicePayload(sides, count) {
  const rolls = [];
  let total = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }

  let diceText = `# ${emojis.common.dice} Dice Roll\n\n`;
  diceText += `**Dice:** ${count}d${sides}\n`;
  diceText += `**Rolls:** ${rolls.join(', ')}\n`;
  if (count > 1) {
    diceText += `**Total:** ${total}`;
  }

  const textDisplay = new TextDisplayBuilder().setContent(diceText);

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
