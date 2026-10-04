const {
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const { generateHelpImage } = require('../../utils/helpCanvas');
const emojis = require('../../utils/emojis');

const CATEGORY_ORDER = ['setup', 'utility', 'info', 'moderation', 'fun', 'games', 'social', 'image', 'economy', 'music', 'levelling', 'invites', 'messages', 'giveaway', 'automod', 'tools', 'tickets', 'welcome', 'premium'];
const SETUP_COMMANDS = new Set(['level', 'invites', 'welcome', 'tickets', 'notifier', 'verification', 'sticky', 'join2create', 'modmail', 'reactionrole', 'suggestion', 'booster', 'suggest']);
const COMMANDS_PER_PAGE = 10;
const CATEGORY_META = {
  setup: { label: `${emojis.categories.setup} Setup`, summary: 'Server systems and configuration' },
  utility: { label: `${emojis.categories.utility} Utility`, summary: 'Useful everyday tools' },
  info: { label: `${emojis.categories.info} Info`, summary: 'Server and user details' },
  moderation: { label: `${emojis.categories.moderation} Moderation`, summary: 'Admin and staff controls' },
  fun: { label: `${emojis.categories.fun} Fun`, summary: 'Games and light commands' },
  games: { label: `${emojis.categories.games} Games`, summary: 'Interactive game commands' },
  social: { label: `${emojis.categories.social} Social`, summary: 'Social interaction commands' },
  image: { label: `${emojis.categories.image} Image`, summary: 'Image and text effect commands' },
  economy: { label: `${emojis.categories.economy} Economy`, summary: 'Balance, work, and shop' },
  music: { label: `${emojis.categories.music} Music`, summary: 'Playback and queue controls' },
  levelling: { label: `${emojis.categories.levelling} Levelling`, summary: 'XP, rank cards, and level rewards' },
  invites: { label: `${emojis.categories.invites} Invites`, summary: 'Invite tracking and management' },
  messages: { label: `${emojis.categories.messages} Messages`, summary: 'Message tracking and stats' },
  giveaway: { label: `${emojis.categories.giveaway} Giveaway`, summary: 'Giveaway management' },
  automod: { label: `${emojis.categories.automod} Automod`, summary: 'Automated moderation' },
  tools: { label: `${emojis.categories.tools} Tools`, summary: 'Utility tools and converters' },
  tickets: { label: `${emojis.categories.tickets} Tickets`, summary: 'Support ticket system' },
  welcome: { label: `${emojis.categories.welcome} Welcome`, summary: 'Welcome system with cards' },
  premium: { label: `${emojis.categories.premium || '👑'} Premium`, summary: 'Exclusive AI and advanced features' },
};

function getCategoryMeta(key) {
  if (CATEGORY_META[key]) return CATEGORY_META[key];

  const label = key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Other';

  const catEmoji = emojis.categories?.[key] ? `${emojis.categories[key]} ` : '';
  return { label: `${catEmoji}${label}`, summary: `${label} commands` };
}

function getInviteUrl(client) {
  return `https://discord.com/oauth2/authorize?client_id=${client.config.clientId}&scope=bot%20applications.commands&permissions=8`;
}

function getSupportUrl() {
  return process.env.SUPPORT_SERVER_URL || process.env.SUPPORT_URL || 'https://discord.gg/your-server';
}

function getVoteUrl(client) {
  return process.env.VOTE_URL || `https://top.gg/bot/${client.config.clientId}/vote`;
}

function getCommandsByMode(client, mode) {
  const commands = Array.from(client.commands.values());
  if (mode === 'prefix') {
    return commands.filter((command) => !command.slashOnly);
  }

  return commands.filter((command) => command.data);
}

function groupCommands(commands) {
  const grouped = {};

  for (const command of commands) {
    const key = String(command.category || 'other').toLowerCase();
    if (!grouped[key]) {
      grouped[key] = [];
    }

    if (SETUP_COMMANDS.has(command.name)) {
      if (!grouped.setup) {
        grouped.setup = [];
      }

      grouped.setup.push(command);
      continue;
    }

    grouped[key].push(command);
  }

  return grouped;
}

function getCategoryKeys(groupedCommands) {
  const knownKeys = CATEGORY_ORDER.filter((key) => groupedCommands[key]?.length);
  const extraKeys = Object.keys(groupedCommands)
    .filter((key) => !CATEGORY_ORDER.includes(key) && groupedCommands[key]?.length)
    .sort();

  return [...knownKeys, ...extraKeys];
}

function getCommandData(command) {
  return command.data && typeof command.data.toJSON === 'function'
    ? command.data.toJSON()
    : command.data;
}

function getSubcommands(command) {
  const jsonData = getCommandData(command);
  return jsonData?.options?.filter(opt => opt.type === 1) || [];
}

function formatCommandLine(command, mode, prefix) {
  const commandName = command.data?.name || command.name;
  const trigger = mode === 'prefix' ? `${prefix}${command.name}` : `/${commandName}`;

  if (command.data) {
    const subcommands = getSubcommands(command);

    if (subcommands.length > 0) {
      return subcommands.map(sub => {
        const subTrigger = mode === 'prefix' ? `${prefix}${command.name} ${sub.name}` : `/${commandName} ${sub.name}`;
        return `\`${subTrigger}\` - ${sub.description}`;
      }).join('\n');
    }
  }

  return `\`${trigger}\` - ${command.description}`;
}

function getCommandLines(commands, mode, prefix) {
  return commands.flatMap((command) => formatCommandLine(command, mode, prefix).split('\n'));
}

function parseEmoji(emojiStr) {
  if (!emojiStr) return undefined;
  if (typeof emojiStr === 'object' && (emojiStr.id || emojiStr.name)) return emojiStr;
  if (typeof emojiStr !== 'string') return undefined;
  const match = emojiStr.match(/<(a?):([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    return {
      id: match[3],
      name: match[2],
      animated: match[1] === 'a'
    };
  }
  const trimmed = emojiStr.trim();
  return trimmed || undefined;
}

function getCommandCount(command) {
  if (command.data) {
    const subcommands = getSubcommands(command);
    if (subcommands.length > 0) {
      return subcommands.length;
    }
  }
  return 1;
}

function createOverviewFields(groupedCommands) {
  const categoryKeys = getCategoryKeys(groupedCommands);
  const totalCommands = categoryKeys.reduce((count, key) => {
    if (!groupedCommands[key]) return count;
    return count + groupedCommands[key].reduce((sum, cmd) => sum + getCommandCount(cmd), 0);
  }, 0);

  const activeCategories = categoryKeys.filter((key) => groupedCommands[key]?.length);
  const categoryPreview = categoryKeys
    .map((key) => {
      const cmdCount = groupedCommands[key].reduce((sum, cmd) => sum + getCommandCount(cmd), 0);
      return `- **${getCategoryMeta(key).label}**: ${cmdCount} command${cmdCount !== 1 ? 's' : ''}`;
    })
    .join('\n');

  return [
    {
      name: 'Overview',
      value: `- **${totalCommands} commands** ready to use\n- **${activeCategories.length} categories** to explore\n- Pick a category from the selector below to open the full command list\n\n${categoryPreview}`,
      inline: false,
    },
  ];
}

function createCommandField(commands, mode, prefix, categoryKey) {
  return {
    name: `${getCategoryMeta(categoryKey).label} Commands`,
    value: commands.map((command) => formatCommandLine(command, mode, prefix)).join('\n'),
    inline: false,
  };
}

function createSelectMenu(client, groupedCommands, mode, userId, selectedCategory) {
  const categoryKeys = getCategoryKeys(groupedCommands).slice(0, 24);

  const homeEmoji = parseEmoji(emojis.common?.home);
  const overviewOption = {
    label: 'Overview',
    value: 'overview',
  };
  if (homeEmoji) overviewOption.emoji = homeEmoji;

  const categoryOptions = categoryKeys.map((key) => {
    const meta = getCategoryMeta(key);
    const catEmojiStr = emojis.categories?.[key];
    let cleanLabel = meta.label;
    if (catEmojiStr) {
      cleanLabel = cleanLabel.replace(catEmojiStr, '');
    }
    cleanLabel = cleanLabel.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '').trim() || key;

    const catEmoji = parseEmoji(catEmojiStr);
    const option = {
      label: cleanLabel,
      value: key,
    };
    if (catEmoji) option.emoji = catEmoji;
    return option;
  });

  return new StringSelectMenuBuilder()
    .setCustomId(`help-category:${mode}:${userId}`)
    .setPlaceholder(`${client.user.username} | Help Menu`)
    .addOptions([overviewOption, ...categoryOptions]);
}

function createLinkButtons(client) {
  return [
    new ButtonBuilder()
      .setLabel('Invite')
      .setStyle(ButtonStyle.Link)
      .setURL(getInviteUrl(client)),
    new ButtonBuilder()
      .setLabel('Support Server')
      .setStyle(ButtonStyle.Link)
      .setURL(getSupportUrl()),
    new ButtonBuilder()
      .setLabel('Website')
      .setStyle(ButtonStyle.Link)
      .setURL('https://echohq.in'),
    new ButtonBuilder()
      .setLabel('Vote')
      .setStyle(ButtonStyle.Link)
      .setURL(getVoteUrl(client)),
  ];
}

function createPageButtons(mode, userId, selectedCategory, page, totalPages) {
  if (totalPages <= 1) return [];

  return [
    new ButtonBuilder()
      .setCustomId(`help-page:${mode}:${userId}:${selectedCategory}:0:first`)
      .setEmoji(emojis.common.first)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`help-page:${mode}:${userId}:${selectedCategory}:${page - 1}:back`)
      .setEmoji(emojis.common.back)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`help-page:${mode}:${userId}:overview:0:home`)
      .setEmoji(emojis.common.home)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help-page:${mode}:${userId}:${selectedCategory}:${page + 1}:next`)
      .setEmoji(emojis.common.arrow)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`help-page:${mode}:${userId}:${selectedCategory}:${totalPages - 1}:last`)
      .setEmoji(emojis.common.last)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  ];
}

async function createHelpPayload({ client, mode, selectedCategory, userId, page = 0 }) {
  const normCategory = selectedCategory === 'overview' ? null : selectedCategory;
  const commands = getCommandsByMode(client, mode);
  const groupedCommands = groupCommands(commands);
  const categoryKeys = getCategoryKeys(groupedCommands);
  const prefix = client.config.prefix;
  const totalCommands = commands.reduce((sum, cmd) => sum + getCommandCount(cmd), 0);

  const container = new ContainerBuilder();
  const files = [];

  if (normCategory && groupedCommands[normCategory]?.length) {
    const commandLines = getCommandLines(groupedCommands[normCategory], mode, prefix);
    const totalPages = Math.max(1, Math.ceil(commandLines.length / COMMANDS_PER_PAGE));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
    const pageLines = commandLines.slice(
      currentPage * COMMANDS_PER_PAGE,
      currentPage * COMMANDS_PER_PAGE + COMMANDS_PER_PAGE
    );

    const contentText = `### ${getCategoryMeta(normCategory).label} Commands\n\n${pageLines.join('\n')}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(contentText));
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  } else {
    // Overview mode
    const imageBuffer = await generateHelpImage(client);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'help-banner.png' });
    files.push(attachment);

    const gallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('attachment://help-banner.png')
    );
    container.addMediaGalleryComponents(gallery);
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const introText = [
      `Hi there, I'm **${client.user.username}**! ${emojis.status.welcome_back}`,
      `I'm an advanced multi-purpose bot designed to elevate your server experience.`,
      `I offer over **${totalCommands}** commands spread across **${categoryKeys.length}** distinct categories to help you manage and grow your community.`,
    ].join('\n');

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(introText));
    
    // Add Div above categories
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    const categoryLines = categoryKeys.map((key, i) => {
      const meta = getCategoryMeta(key);
      const cmdCount = groupedCommands[key].reduce((sum, cmd) => sum + getCommandCount(cmd), 0);
      const line = `- **${meta.label}** **:** ${cmdCount} commands`;
      return i === 6 ? line + '\n' : line;
    });

    const overviewText = `### Browse Categories\n${categoryLines.join('\n')}`;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(overviewText));
    
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  }

  const selectMenu = createSelectMenu(client, groupedCommands, mode, userId, normCategory);
  const linkButtons = createLinkButtons(client);
  const selectedLines = normCategory && groupedCommands[normCategory]
    ? getCommandLines(groupedCommands[normCategory], mode, prefix)
    : [];
  const selectedTotalPages = Math.max(1, Math.ceil(selectedLines.length / COMMANDS_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 0), selectedTotalPages - 1);

  if (normCategory) {
    const pageButtons = createPageButtons(mode, userId, normCategory, currentPage, selectedTotalPages);
    if (pageButtons.length > 0) {
      container.addActionRowComponents(actionRow => actionRow.setComponents(...pageButtons));
    }
  }

  container.addActionRowComponents(actionRow => actionRow.setComponents(selectMenu));

  container.addActionRowComponents(actionRow => actionRow.setComponents(...linkButtons));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files
  };
}

module.exports = {
  category: 'Info',
  name: 'help',
  description: 'Show all available commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async executePrefix(message, args, client) {
    const selectedCategory = CATEGORY_ORDER.includes((args[0] || '').toLowerCase())
      ? args[0].toLowerCase()
      : null;

    const payload = await createHelpPayload({
      client,
      mode: 'prefix',
      selectedCategory,
      page: 0,
      userId: message.author.id,
    });
    
    await message.reply(payload);
  },

  async executeSlash(interaction, client) {
    await interaction.deferReply();
    const payload = await createHelpPayload({
      client,
      mode: 'slash',
      selectedCategory: null,
      page: 0,
      userId: interaction.user.id,
    });
    
    await interaction.editReply(payload);
  },

  async handleCategorySelect(interaction, client) {
    const [, mode, ownerId] = interaction.customId.split(':');

    if (interaction.user.id !== ownerId) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.status.warning} Only the original user can use this help menu.`)
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer],
      });
    }

    const selectedCategory = interaction.values[0] === 'overview' ? null : interaction.values[0];
    
    await interaction.deferUpdate();
    
    const payload = await createHelpPayload({
      client,
      mode,
      selectedCategory,
      page: 0,
      userId: ownerId,
    });
    
    return interaction.editReply(payload);
  },

  async handlePageButton(interaction, client) {
    const [, mode, ownerId, selectedCategory, rawPage] = interaction.customId.split(':');

    if (interaction.user.id !== ownerId) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Only the original user can use this help menu.')
        );

      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer],
      });
    }

    await interaction.deferUpdate();

    const payload = await createHelpPayload({
      client,
      mode,
      selectedCategory,
      page: Number.parseInt(rawPage, 10) || 0,
      userId: ownerId,
    });

    return interaction.editReply(payload);
  },
};
