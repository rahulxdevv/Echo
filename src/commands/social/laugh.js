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
  name: 'laugh',
  description: 'Laugh',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('laugh')
    .setDescription('Laugh'),

  async executePrefix(message, args, client) {
    const gifUrl = await getGiphyGif('laugh');
    await message.reply(createLaughPayload(message.author, gifUrl));
  },

  async executeSlash(interaction, client) {
    const gifUrl = await getGiphyGif('laugh');
    await interaction.reply(createLaughPayload(interaction.user, gifUrl));
  }
};

function createLaughPayload(author, gifUrl) {
  let laughText = `# ${emojis.social.laugh} Laugh\n\n**${author.username}** is laughing!\n\n*That's hilarious! ${emojis.social.laughing}*`;

  const textDisplay = new TextDisplayBuilder().setContent(laughText);

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
