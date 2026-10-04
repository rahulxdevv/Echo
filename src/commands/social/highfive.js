const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('discord.js');
const emojis = require('../../utils/emojis');
const { getGiphyGif } = require('../../utils/giphy');

module.exports = {
  category: 'Social',
  name: 'highfive',
  description: 'High five someone',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('highfive')
    .setDescription('High five someone')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to high five')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const user = message.mentions.users.first();

    if (!user) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!highfive @user\`\nExample: \`!highfive @John\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const gifUrl = await getGiphyGif('highfive');
    await message.reply(createHighFivePayload(message.author, user, gifUrl));
  },

  async executeSlash(interaction, client) {
    const user = interaction.options.getUser('user');
    const gifUrl = await getGiphyGif('highfive');
    await interaction.reply(createHighFivePayload(interaction.user, user, gifUrl));
  }
};

function createHighFivePayload(author, target, gifUrl) {
  let highFiveText = `# ${emojis.social.highfive} High Five\n\n`;
  highFiveText += `**${author.username}** gives a high five to **${target.username}**!\n\n`;
  highFiveText += `*Way to go! ${emojis.social.celebrate}*`;

  const textDisplay = new TextDisplayBuilder().setContent(highFiveText);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const gifButton = new ButtonBuilder()
    .setLabel('View GIF')
    .setStyle(ButtonStyle.Link)
    .setURL(gifUrl);

  const gallery = new MediaGalleryBuilder().addItems(
    new MediaGalleryItemBuilder().setURL(gifUrl)
  );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator)
    .addMediaGalleryComponents(gallery)
    .addActionRowComponents(actionRow =>
      actionRow.setComponents(gifButton)
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
