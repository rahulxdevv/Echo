const {
  SlashCommandBuilder,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags,
  ButtonStyle,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const emojis = require('../../utils/emojis');
const os = require('os');

module.exports = {
  category: 'Info',
  name: 'bot',
  description: 'Bot information and community subcommands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Bot information and community subcommands')
    .addSubcommand(sub => sub.setName('info').setDescription('Show detailed information about the bot'))
    .addSubcommand(sub => sub.setName('changelogs').setDescription('Show the latest bot updates'))
    .addSubcommand(sub => sub.setName('donate').setDescription('Support the bot developer'))
    .addSubcommand(sub => sub.setName('feedback').setDescription('Send feedback to the developer'))
    .addSubcommand(sub => sub.setName('bug').setDescription('Report a bug found in the bot'))
    .addSubcommand(sub => sub.setName('suggestion').setDescription('Suggest a new feature for the bot')),

  async executePrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      return message.reply('Usage: `!bot <info|changelogs|donate|feedback|bug|suggestion>`');
    }

    switch (sub) {
      case 'info':
        await this.handleInfo(message, client);
        break;
      case 'changelogs':
        await this.handleChangelogs(message, client);
        break;
      case 'donate':
        await this.handleDonate(message, client);
        break;
      case 'feedback':
      case 'bug':
      case 'suggestion':
        const content = args.slice(1).join(' ');
        if (!content) return message.reply(`Please provide your ${sub} content. Usage: \`!bot ${sub} <message>\``);
        await this.submitReport(message, sub, content, client, message.author);
        break;
      default:
        message.reply('Unknown subcommand.');
    }
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (['feedback', 'bug', 'suggestion'].includes(sub)) {
      const modal = new ModalBuilder()
        .setCustomId(`bot-modal:${sub}`)
        .setTitle(`Submit ${sub.charAt(0).toUpperCase() + sub.slice(1)}`);

      const input = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Your Message')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(`Enter your ${sub} here...`)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    switch (sub) {
      case 'info':
        await this.handleInfo(interaction, client);
        break;
      case 'changelogs':
        await this.handleChangelogs(interaction, client);
        break;
      case 'donate':
        await this.handleDonate(interaction, client);
        break;
    }
  },

  async handleInfo(context, client) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;

    const content = [
      `# ${emojis.categories.info} Bot Information\n`,
      `**Name:** ${client.user.username}`,
      `**Library:** Discord.js v14`,
      `**Uptime:** ${days}d ${hours}h ${minutes}m`,
      `**Servers:** ${client.guilds.cache.size}`,
      `**Users:** ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`,
      `**Node.js:** ${process.version}`,
      `**Platform:** ${os.platform()} (${os.arch()})`,
      `**Memory:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`
    ].join('\n');

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },

  async handleChangelogs(context, client) {
    const content = [
      `# ${emojis.common.celebration} Latest Changelogs\n`,
      `**v1.2.0 (Latest)**`,
      `- Added advanced server backup & cloning system.`,
      `- Implemented temporary role functionality.`,
      `- Redesigned help menu with emoji navigation.`,
      `- Upgraded console logging system.`,
      `- Fixed various Mongoose index warnings.`
    ].join('\n');

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },

  async handleDonate(context, client) {
    const content = [
      `# ${emojis.common.fire} Support the Developer\n`,
      `If you like the bot, consider supporting the development!`,
      `Your support helps us keep the bot running and bring new features.`
    ].join('\n');

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    const button = new ButtonBuilder().setLabel('Donate Now').setStyle(ButtonStyle.Link).setURL('https://echohq.in/donate');

    await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container], actionRows: [new ActionRowBuilder().addComponents(button)] });
  },

  async submitReport(context, type, content, client, user) {
    const reportChannelId = process.env.REPORT_CHANNEL_ID;
    if (!reportChannelId) {
      return context.reply('Error: `REPORT_CHANNEL_ID` is not configured in the bot environment.');
    }

    const channel = await client.channels.fetch(reportChannelId).catch(() => null);
    if (!channel) return context.reply('Error: Could not find the report channel.');

    const title = type.charAt(0).toUpperCase() + type.slice(1);
    const emoji = type === 'bug' ? emojis.status.warning : (type === 'suggestion' ? emojis.common.plus : emojis.common.neutral);

    const reportContent = [
      `# ${emoji} New ${title} Received\n`,
      `**From:** ${user.tag} (${user.id})`,
      `**Server:** ${context.guild?.name || 'DM'}`,
      `**Content:**\n${content}`
    ].join('\n');

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(reportContent));
    await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });

    await context.reply({ content: `✅ Your ${type} has been submitted successfully. Thank you for helping us!`, ephemeral: true });
  }
};
