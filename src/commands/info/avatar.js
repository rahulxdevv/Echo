const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require('discord.js');
const { createCardMessage } = require('../../utils/respond');

function getAvatarUrls(user) {
  return {
    png: user.displayAvatarURL({ extension: 'png', size: 4096 }),
    webp: user.displayAvatarURL({ extension: 'webp', size: 4096 }),
    dynamic: user.displayAvatarURL({ forceStatic: false, size: 4096 }),
  };
}

function createAvatarPayload(user) {
  const urls = getAvatarUrls(user);

  return createCardMessage(
    {
      title: `${user.username}'s Avatar`,
      description: [
        `Previewing the profile image for **${user.tag}**.`,
        `User ID: \`${user.id}\``,
      ].join('\n'),
      image: {
        url: urls.dynamic,
      },
      footer: {
        text: 'Use the buttons below to open the avatar in your browser.',
      },
    },
    {
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Open Avatar')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.dynamic),
          new ButtonBuilder()
            .setLabel('PNG')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.png),
          new ButtonBuilder()
            .setLabel('WEBP')
            .setStyle(ButtonStyle.Link)
            .setURL(urls.webp),
        ).toJSON(),
      ],
    },
  );
}

module.exports = {
  category: 'Info',
  name: 'avatar',
  description: 'Get a user\'s avatar',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to get the avatar of')
        .setRequired(false)),

  async executePrefix(message) {
    const user = message.mentions.users.first() || message.author;
    await message.reply(createAvatarPayload(user));
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    await interaction.reply(createAvatarPayload(user));
  },
};
