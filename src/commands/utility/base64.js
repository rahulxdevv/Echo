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
  name: 'base64',
  description: 'Encode or decode base64',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('base64')
    .setDescription('Encode or decode base64')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Action to perform')
        .setRequired(true)
        .addChoices(
          { name: 'Encode', value: 'encode' },
          { name: 'Decode', value: 'decode' }
        ))
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('Text to encode/decode')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    if (args.length < 2) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!base64 <encode|decode> <text>\`\nExample: \`!base64 encode Hello World\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const action = args[0].toLowerCase();
    const text = args.slice(1).join(' ');

    if (!['encode', 'decode'].includes(action)) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Action must be either \`encode\` or \`decode\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    await message.reply(createBase64Payload(action, text));
  },

  async executeSlash(interaction, client) {
    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text');

    await interaction.reply(createBase64Payload(action, text));
  }
};

function createBase64Payload(action, text) {
  let result;
  let error = false;

  try {
    if (action === 'encode') {
      result = Buffer.from(text, 'utf-8').toString('base64');
    } else {
      result = Buffer.from(text, 'base64').toString('utf-8');
    }
  } catch (err) {
    error = true;
    result = 'Invalid input for decoding';
  }

  let base64Text = error
    ? `# ${emojis.status.warning} Error\n\n${result}`
    : `# ${emojis.mod.lock} Base64 ${action === 'encode' ? 'Encoder' : 'Decoder'}\n\n**Input:**\n${text}\n\n**Output:**\n${result}`;

  const textDisplay = new TextDisplayBuilder().setContent(base64Text);

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
