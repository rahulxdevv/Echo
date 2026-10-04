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
  name: 'embed',
  description: 'Create a custom embed message',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Embed title')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Embed description')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Embed color in hex (e.g., #FF0000)')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    if (args.length < 2) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!embed <title> | <description> | [color]\`\nExample: \`!embed My Title | This is the description | #FF0000\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const parts = args.join(' ').split('|').map(p => p.trim());
    const title = parts[0] || 'Embed';
    const description = parts[1] || 'No description';
    const color = parts[2];

    await message.channel.send(createEmbedPayload(title, description, color, message.author));
  },

  async executeSlash(interaction, client) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getString('color');

    await interaction.reply({
      content: 'Embed created!',
      flags: MessageFlags.Ephemeral,
    });

    await interaction.channel.send(createEmbedPayload(title, description, color, interaction.user));
  }
};

function createEmbedPayload(title, description, colorHex, author) {
  let embedText = `# ${title}\n\n${description}\n\n*Created by ${author.username}*`;

  const textDisplay = new TextDisplayBuilder().setContent(embedText);

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
