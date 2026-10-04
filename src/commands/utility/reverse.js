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
  name: 'reverse',
  description: 'Reverse text',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('Reverse text')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Text to reverse')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    if (args.length === 0) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!reverse <text>\`\nExample: \`!reverse Hello World\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const text = args.join(' ');
    await message.reply(createReversePayload(text));
  },

  async executeSlash(interaction, client) {
    const text = interaction.options.getString('text');
    await interaction.reply(createReversePayload(text));
  }
};

function createReversePayload(text) {
  const reversed = text.split('').reverse().join('');

  let reverseText = `# ${emojis.fun.reverse} Text Reverser\n\n`;
  reverseText += `**Original:**\n${text}\n\n`;
  reverseText += `**Reversed:**\n${reversed}`;

  const textDisplay = new TextDisplayBuilder().setContent(reverseText);

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
