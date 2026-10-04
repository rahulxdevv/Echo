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
  name: 'poke',
  description: 'Poke someone',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('poke')
    .setDescription('Poke someone')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to poke')
        .setRequired(true)),

  async executePrefix(message, args, client) {
    const user = message.mentions.users.first();

    if (!user) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Usage: \`!poke @user\`\nExample: \`!poke @John\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }

    const gifUrl = await getGiphyGif('poke');
    await message.reply(createPokePayload(message.author, user, gifUrl));
  },

  async executeSlash(interaction, client) {
    const user = interaction.options.getUser('user');
    const gifUrl = await getGiphyGif('poke');
    await interaction.reply(createPokePayload(interaction.user, user, gifUrl));
  }
};

function createPokePayload(author, target, gifUrl) {
  let pokeText = `# ${emojis.social.poke} Poke\n\n`;
  pokeText += `**${author.username}** pokes **${target.username}**!\n\n`;
  pokeText += `*Hey! Stop that! ${emojis.social.angry}*`;
  const textDisplay = new TextDisplayBuilder().setContent(pokeText);

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
