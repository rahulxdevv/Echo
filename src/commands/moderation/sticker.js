const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const emojis = require('../../utils/emojis');
const axios = require('axios');

module.exports = {
  category: 'Moderation',
  name: 'sticker',
  description: 'Manage server stickers',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('sticker')
    .setDescription('Manage server stickers')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a new sticker to the server')
        .addStringOption(opt => opt.setName('url').setDescription('The URL of the sticker image (PNG/APNG/Lottie)').setRequired(true))
        .addStringOption(opt => opt.setName('name').setDescription('The name for the sticker').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('A related emoji for the sticker').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('A description for the sticker'))
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a sticker from the server')
        .addStringOption(opt => opt.setName('id').setDescription('The ID of the sticker to delete').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all server stickers')
    ),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return replyError(message, 'You need `Manage Emojis and Stickers` permission to use this command.');
    }

    const sub = args[0]?.toLowerCase();
    if (!sub) return replyError(message, 'Usage: `!sticker <add|delete|list>`');

    switch (sub) {
      case 'add':
        const url = args[1];
        const name = args[2];
        const emoji = args[3];
        const desc = args.slice(4).join(' ');
        if (!url || !name || !emoji) return replyError(message, 'Usage: `!sticker add <url> <name> <emoji> [description]`');
        await this.handleAdd(message, url, name, emoji, desc);
        break;
      case 'delete':
        const stickerId = args[1];
        if (!stickerId) return replyError(message, 'Usage: `!sticker delete <stickerId>`');
        await this.handleDelete(message, stickerId);
        break;
      case 'list':
        await this.handleList(message);
        break;
      default:
        replyError(message, 'Unknown subcommand. Available: add, delete, list');
    }
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'add':
        await this.handleAdd(
          interaction, 
          interaction.options.getString('url'), 
          interaction.options.getString('name'), 
          interaction.options.getString('emoji'), 
          interaction.options.getString('description')
        );
        break;
      case 'delete':
        await this.handleDelete(interaction, interaction.options.getString('id'));
        break;
      case 'list':
        await this.handleList(interaction);
        break;
    }
  },

  async handleAdd(context, url, name, emoji, description) {
    try {
      await context.guild.stickers.create({
        file: url,
        name: name,
        tags: emoji,
        description: description || ''
      });

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} Sticker Added\n\nSuccessfully added sticker **${name}** to the server.`)
      );
      await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      await replyError(context, `Failed to add sticker: ${error.message}`);
    }
  },

  async handleDelete(context, stickerId) {
    const sticker = context.guild.stickers.cache.get(stickerId);
    if (!sticker) return replyError(context, 'Could not find that sticker in this server.');

    try {
      await sticker.delete();
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} Sticker Deleted\n\nSuccessfully removed the sticker from the server.`)
      );
      await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      await replyError(context, `Failed to delete sticker: ${error.message}`);
    }
  },

  async handleList(context) {
    const stickers = context.guild.stickers.cache;
    if (!stickers.size) return context.reply('This server has no custom stickers.');

    const stickerList = stickers.map(s => `- **${s.name}** (\`${s.id}\`)`).join('\n');

    const textDisplay = new TextDisplayBuilder().setContent(
      `# ${emojis.categories.info} Server Stickers\n\n` +
      stickerList
    );

    const container = new ContainerBuilder().addTextDisplayComponents(textDisplay);
    await context.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }
};
