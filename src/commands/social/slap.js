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
  name: 'slap',
  description: 'Slap someone',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap someone')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to slap')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const user = message.mentions.users.first();

    if (!user) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!slap @user\`\nExample: \`!slap @John\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const gifUrl = await getGiphyGif('slap');
    await message.reply(createSlapPayload(message.author, user, gifUrl));
  },

  async executeSlash(interaction, client) {
    const user = interaction.options.getUser('user');
    const gifUrl = await getGiphyGif('slap');
    await interaction.reply(createSlapPayload(interaction.user, user, gifUrl));
  }
};

function createSlapPayload(author, target, gifUrl) {
  let slapText = `# ${emojis.social.slap} Slap\n\n`;
  slapText += `**${author.username}** slaps **${target.username}**!\n\n`;
  slapText += `*Ouch! That looked painful! ${emojis.media.explosion}*`;

  const textDisplay = new TextDisplayBuilder().setContent(slapText);

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
