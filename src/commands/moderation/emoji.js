const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Moderation',
  name: 'emoji',
  description: 'Manage server emojis',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Manage server emojis')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a new emoji to the server')
        .addStringOption(opt => opt.setName('url').setDescription('The URL of the emoji image').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('The name for the emoji').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('steal')
        .setDescription('Steal an emoji from another server')
        .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to steal (paste it here)').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('A new name for the emoji (optional)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete an emoji from the server')
        .addStringOption(opt => opt.setName('emoji').setDescription('The emoji to delete').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all server emojis')
    ),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return replyError(message, 'You need `Manage Emojis and Stickers` permission to use this command.');
    }

    const sub = args[0]?.toLowerCase();
    if (!sub) return replyError(message, 'Usage: `!emoji <add|steal|delete|list>`');

    switch (sub) {
      case 'add':
        const url = args[1];
        const name = args[2];
        if (!url || !name) return replyError(message, 'Usage: `!emoji add <url> <name>`');
        await this.handleAdd(message, url, name);
        break;
      case 'steal':
        const rawEmoji = args[1];
        const stealName = args[2];
        if (!rawEmoji) return replyError(message, 'Usage: `!emoji steal <emoji> [name]`');
        await this.handleSteal(message, rawEmoji, stealName);
        break;
      case 'delete':
        const emojiToDelete = args[1];
        if (!emojiToDelete) return replyError(message, 'Usage: `!emoji delete <emoji>`');
        await this.handleDelete(message, emojiToDelete);
        break;
      case 'list':
        await this.handleList(message);
        break;
      default:
        replyError(message, 'Unknown subcommand. Available: add, steal, delete, list');
    }
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'add':
        await this.handleAdd(interaction, interaction.options.getString('url'), interaction.options.getString('name'));
        break;
      case 'steal':
        await this.handleSteal(interaction, interaction.options.getString('emoji'), interaction.options.getString('name'));
        break;
      case 'delete':
        await this.handleDelete(interaction, interaction.options.getString('emoji'));
        break;
      case 'list':
        await this.handleList(interaction);
        break;
    }
  },

  async handleAdd(context, url, name) {
    try {
      const emoji = await context.guild.emojis.create({ attachment: url, name: name });
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} Emoji Added\n\nSuccessfully added ${emoji} (\`:${emoji.name}:\`) to the server.`)
      );
      await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      await replyError(context, `Failed to add emoji: ${error.message}`);
    }
  },

  async handleSteal(context, rawEmoji, customName) {
    const emojiRegex = /<(a?):([a-zA-Z0-9_]+):([0-9]+)>/;
    const match = rawEmoji.match(emojiRegex);

    if (!match) {
      return replyError(context, 'Invalid emoji format. Please provide a custom emoji from another server.');
    }

    const animated = match[1] === 'a';
    const name = customName || match[2];
    const id = match[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;

    await this.handleAdd(context, url, name);
  },

  async handleDelete(context, emojiInput) {
    const emojiId = emojiInput.split(':').pop().replace(/>/g, '');
    const emoji = context.guild.emojis.cache.get(emojiId) || context.guild.emojis.cache.find(e => e.name === emojiInput);

    if (!emoji) return replyError(context, 'Could not find that emoji in this server.');

    try {
      await emoji.delete();
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} Emoji Deleted\n\nSuccessfully removed the emoji from the server.`)
      );
      await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      await replyError(context, `Failed to delete emoji: ${error.message}`);
    }
  },

  async handleList(context) {
    const emojisCache = context.guild.emojis.cache;
    if (!emojisCache.size) return context.reply('This server has no custom emojis.');

    const staticEmojis = emojisCache.filter(e => !e.animated).map(e => `${e} \`<:${e.name}:${e.id}>\``).join('\n') || 'None';
    const animatedEmojis = emojisCache.filter(e => e.animated).map(e => `${e} \`<a:${e.name}:${e.id}>\``).join('\n') || 'None';

    const textDisplay = new TextDisplayBuilder().setContent(
      `# ${emojis.categories.info} Server Emojis\n\n` +
      `### Static Emojis\n${staticEmojis}\n\n` +
      `### Animated Emojis\n${animatedEmojis}`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(textDisplay);
    await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }
};
