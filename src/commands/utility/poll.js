const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Utility',
  name: 'poll',
  description: 'Create a simple poll',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a simple poll')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('The poll question')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('option1')
        .setDescription('First option')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('option2')
        .setDescription('Second option')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('option3')
        .setDescription('Third option')
        .setRequired(false))
    .addStringOption(option =>
      option
        .setName('option4')
        .setDescription('Fourth option')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    if (args.length < 3) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!poll <question> | <option1> | <option2> | [option3] | [option4]\`\nExample: \`!poll Favorite color? | Red | Blue | Green\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const parts = args.join(' ').split('|').map(p => p.trim());
    const question = parts[0];
    const options = parts.slice(1, 5).filter(o => o);

    if (options.length < 2) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} You need at least 2 options for a poll!`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const pollMessage = await message.channel.send(createPollPayload(question, options, message.author));
    const poll_emojis = [emojis.common.one, emojis.common.two, emojis.common.three, emojis.common.four];
    for (let i = 0; i < options.length; i++) {
      await pollMessage.react(poll_emojis[i]);
    }
  },

  async executeSlash(interaction, client) {
    const question = interaction.options.getString('question');
    const options = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(o => o);

    await interaction.reply(createPollPayload(question, options, interaction.user));

    const message = await interaction.fetchReply();
    const poll_emojis = [emojis.common.one, emojis.common.two, emojis.common.three, emojis.common.four];
    for (let i = 0; i < options.length; i++) {
      await message.react(poll_emojis[i]);
    }
  }
};

function createPollPayload(question, options, author) {
  const poll_emojis = [emojis.common.one, emojis.common.two, emojis.common.three, emojis.common.four];

  let pollText = `# ${emojis.categories.messages} Poll\n\n`;
  pollText += `**${question}**\n\n`;

  options.forEach((option, index) => {
    pollText += `${poll_emojis[index]} ${option}\n`;
  });

  pollText += `\n*Poll created by ${author.username}*`;

  const textDisplay = new TextDisplayBuilder().setContent(pollText);

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
