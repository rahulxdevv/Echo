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
  name: 'hug',
  description: 'Hug someone',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Hug someone')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to hug')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const user = message.mentions.users.first();

    if (!user) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!hug @user\`\nExample: \`!hug @John\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const gifUrl = await getGiphyGif('hug');
    await message.reply(createHugPayload(message.author, user, gifUrl));
  },

  async executeSlash(interaction, client) {
    const user = interaction.options.getUser('user');
    const gifUrl = await getGiphyGif('hug');
    await interaction.reply(createHugPayload(interaction.user, user, gifUrl));
  }
};

function createHugPayload(author, target, gifUrl) {
  let hugText = `# ${emojis.social.hug} Hug\n\n`;
  hugText += `**${author.username}** hugs **${target.username}**!\n\n`;
  hugText += `*Aww, how sweet! ${emojis.social.two_hearts}*`;

  const textDisplay = new TextDisplayBuilder().setContent(hugText);

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
