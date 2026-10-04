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
  name: 'dance',
  description: 'Dance with someone',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('dance')
    .setDescription('Dance with someone')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to dance with')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    const user = message.mentions.users.first();
    const gifUrl = await getGiphyGif('dance');
    await message.reply(createDancePayload(message.author, user, gifUrl));
  },

  async executeSlash(interaction, client) {
    const user = interaction.options.getUser('user');
    const gifUrl = await getGiphyGif('dance');
    await interaction.reply(createDancePayload(interaction.user, user, gifUrl));
  }
};

function createDancePayload(author, target, gifUrl) {
  let danceText = target
    ? `# ${emojis.social.dance} Dance\n\n**${author.username}** dances with **${target.username}**!\n\n*Let's dance! ${emojis.social.boy_dance}*`
    : `# ${emojis.social.dance} Dance\n\n**${author.username}** is dancing!\n\n*Feeling the rhythm! ${emojis.social.boy_dance}*`;

  const textDisplay = new TextDisplayBuilder().setContent(danceText);

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
