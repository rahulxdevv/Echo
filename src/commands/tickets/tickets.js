const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const {
  getTicketConfig,
  updateTicketConfig,
  createTicket,
  closeTicket,
  claimTicket,
  unclaimTicket,
  setPriority,
  getUserTickets,
  getAllTickets,
  getTicketByChannel,
  generateTranscript,
  sendTicketLog
} = require('../../utils/tickets');
const {
  isDiscordEmoji,
  normalizeDiscordEmoji
} = require('../../utils/emoji');

const BUTTON_STYLE_MAP = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger
};

const EMOJI_UPDATE_FIELDS = {
  buttonEmoji: '🎫',
  closeButtonEmoji: '🔒',
  claimButtonEmoji: '✋',
  unclaimButtonEmoji: '↩️'
};

function normalizeButtonStyle(value) {
  const style = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return BUTTON_STYLE_MAP[style] ? style : null;
}

function parseBoolean(value) {
  return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
}

function addButtonRows(container, buttons) {
  for (let i = 0; i < buttons.length; i += 5) {
    container.addActionRowComponents(actionRow =>
      actionRow.setComponents(...buttons.slice(i, i + 5))
    );
  }

  return container;
}

function sanitizeTicketConfigEmojis(config) {
  config.buttonEmoji = normalizeDiscordEmoji(config.buttonEmoji, '🎫');
  config.closeButtonEmoji = normalizeDiscordEmoji(config.closeButtonEmoji, '🔒');
  config.claimButtonEmoji = normalizeDiscordEmoji(config.claimButtonEmoji, '✋');
  config.unclaimButtonEmoji = normalizeDiscordEmoji(config.unclaimButtonEmoji, '↩️');
  config.transcriptButtonEmoji = normalizeDiscordEmoji(config.transcriptButtonEmoji, '📄');

  config.categories.forEach(category => {
    category.emoji = normalizeDiscordEmoji(category.emoji, '🎫');
  });

  return config;
}

function buildPanelContainer(config) {
  sanitizeTicketConfigEmojis(config);

  const panelContent = [
    `# ${config.panelTitle}`,
    '',
    config.panelDescription
  ];

  if (config.categories.length > 0) {
    panelContent.push('', '**Available Categories:**');
    config.categories.forEach(cat => {
      panelContent.push(`${cat.emoji || '🎫'} **${cat.name}** - ${cat.description}`);
    });
  }

  const panelText = new TextDisplayBuilder().setContent(panelContent.join('\n'));
  const container = new ContainerBuilder();

  if (config.panelThumbnail) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(panelText)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(config.panelThumbnail))
    );
  } else {
    container.addTextDisplayComponents(panelText);
  }

  if (config.panelImage) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(config.panelImage)
      )
    );
  }

  const buttons = [];

  if (config.categories.length > 0) {
    config.categories.forEach(cat => {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`ticket-create:${cat.id}`)
          .setLabel(cat.name.slice(0, 80))
          .setEmoji(cat.emoji || '🎫')
          .setStyle(BUTTON_STYLE_MAP[cat.buttonStyle] || ButtonStyle.Primary)
      );
    });
  } else {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('ticket-create:general')
        .setLabel((config.buttonLabel || 'Create Ticket').slice(0, 80))
        .setEmoji(config.buttonEmoji || '🎫')
        .setStyle(BUTTON_STYLE_MAP[config.buttonStyle] || ButtonStyle.Primary)
    );
  }

  return addButtonRows(container, buttons);
}

async function archiveOrDeleteTicketChannel(channel, ticket, config) {
  if (config.closeCategoryId) {
    await channel.setParent(config.closeCategoryId, { lockPermissions: false });
    await channel.setName(`closed-${ticket.ticketNumber}`).catch(() => null);
    await channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: false,
      SendMessages: false
    }).catch(() => null);
    return 'moved to the closed tickets category';
  }

  setTimeout(async () => {
    try {
      await channel.delete();
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 10000);

  return 'scheduled for deletion in 10 seconds';
}

module.exports = {
  category: 'Tickets',
  name: 'tickets',
  description: 'Ticket system management',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Ticket system management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup the ticket system')
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('Category for ticket channels')
            .addChannelTypes(4) // GuildCategory
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('panel')
            .setDescription('Channel to send the ticket panel')
            .addChannelTypes(0) // GuildText
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('staff_role')
            .setDescription('Staff role that can view, claim, and manage tickets')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('transcript_channel')
            .setDescription('Channel where ticket transcripts are sent')
            .addChannelTypes(0) // GuildText
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('closed_category')
            .setDescription('Optional category to move closed tickets into')
            .addChannelTypes(4) // GuildCategory
        )
        .addChannelOption(option =>
          option
            .setName('log_channel')
            .setDescription('Optional channel for ticket logs')
            .addChannelTypes(0) // GuildText
        )
        .addIntegerOption(option =>
          option
            .setName('max_open')
            .setDescription('Maximum open tickets per user')
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Send or update the ticket panel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for closing')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim the current ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unclaim')
        .setDescription('Unclaim the current ticket')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the ticket')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the ticket')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('priority')
        .setDescription('Set ticket priority')
        .addStringOption(option =>
          option
            .setName('level')
            .setDescription('Priority level')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Urgent', value: 'urgent' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('transcript')
        .setDescription('Generate ticket transcript')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all tickets')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filter by status')
            .addChoices(
              { name: 'Open', value: 'open' },
              { name: 'Closed', value: 'closed' },
              { name: 'All', value: 'all' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure ticket settings')
        .addStringOption(option =>
          option
            .setName('setting')
            .setDescription('Setting to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Max Tickets Per User', value: 'max_tickets' },
              { name: 'Welcome Message', value: 'welcome' },
              { name: 'Panel Title', value: 'title' },
              { name: 'Panel Description', value: 'description' },
              { name: 'Button Label', value: 'button_label' },
              { name: 'Button Emoji', value: 'button_emoji' },
              { name: 'Button Style', value: 'button_style' },
              { name: 'Close Button Label', value: 'close_label' },
              { name: 'Close Button Emoji', value: 'close_emoji' },
              { name: 'Claim Button Label', value: 'claim_label' },
              { name: 'Claim Button Emoji', value: 'claim_emoji' },
              { name: 'Unclaim Button Label', value: 'unclaim_label' },
              { name: 'Unclaim Button Emoji', value: 'unclaim_emoji' },
              { name: 'Panel Thumbnail URL', value: 'panel_thumbnail' },
              { name: 'Panel Image URL', value: 'panel_image' },
              { name: 'Ticket Name Format', value: 'ticket_name' },
              { name: 'Transcript Channel ID', value: 'transcript_channel' },
              { name: 'Closed Category ID', value: 'close_category' },
              { name: 'Log Channel ID', value: 'log_channel' },
              { name: 'Mention User on Create', value: 'mention_user' },
              { name: 'Ping Roles on Create', value: 'ping_on_create' },
              { name: 'Show Claim Button', value: 'show_claim' },
              { name: 'Show Close Button', value: 'show_close' },
              { name: 'Show Transcript Button', value: 'show_transcript' }
            )
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('New value')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Manage ticket categories')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('Category ID')
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Category name')
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Category description')
        )
        .addStringOption(option =>
          option
            .setName('emoji')
            .setDescription('Category emoji')
        )
        .addStringOption(option =>
          option
            .setName('button_style')
            .setDescription('Button style: Primary, Secondary, Success, or Danger')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('staff')
        .setDescription('Manage staff roles')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Staff role')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('pingrole')
        .setDescription('Manage ping roles (roles pinged when ticket is created)')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to ping')
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await this.handleSetup(interaction, client);
        break;
      case 'panel':
        await this.handlePanel(interaction, client);
        break;
      case 'close':
        await this.handleClose(interaction, client);
        break;
      case 'claim':
        await this.handleClaim(interaction, client);
        break;
      case 'unclaim':
        await this.handleUnclaim(interaction, client);
        break;
      case 'add':
        await this.handleAdd(interaction, client);
        break;
      case 'remove':
        await this.handleRemove(interaction, client);
        break;
      case 'priority':
        await this.handlePriority(interaction, client);
        break;
      case 'transcript':
        await this.handleTranscript(interaction, client);
        break;
      case 'list':
        await this.handleList(interaction, client);
        break;
      case 'config':
        await this.handleConfig(interaction, client);
        break;
      case 'category':
        await this.handleCategory(interaction, client);
        break;
      case 'staff':
        await this.handleStaff(interaction, client);
        break;
      case 'pingrole':
        await this.handlePingRole(interaction, client);
        break;
      default:
        await replyError(interaction, 'Unknown subcommand.');
    }
  },

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      return replyError(message, 'Please specify a subcommand. Use `help tickets` for more info.');
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permission to use ticket commands.');
    }

    switch (subcommand) {
      case 'close':
        await this.handleClosePrefix(message, args.slice(1), client);
        break;
      case 'claim':
        await this.handleClaimPrefix(message, args.slice(1), client);
        break;
      case 'unclaim':
        await this.handleUnclaimPrefix(message, args.slice(1), client);
        break;
      case 'transcript':
        await this.handleTranscriptPrefix(message, args.slice(1), client);
        break;
      case 'list':
        await this.handleListPrefix(message, args.slice(1), client);
        break;
      default:
        await replyError(message, 'Unknown subcommand. Available: close, claim, unclaim, transcript, list');
    }
  },

  async handleSetup(interaction, client) {
    const category = interaction.options.getChannel('category');
    const panelChannel = interaction.options.getChannel('panel');
    const staffRole = interaction.options.getRole('staff_role');
    const transcriptChannel = interaction.options.getChannel('transcript_channel');
    const closedCategory = interaction.options.getChannel('closed_category');
    const logChannel = interaction.options.getChannel('log_channel');
    const maxOpen = interaction.options.getInteger('max_open') || 3;

    if (category.type !== 4) {
      return replyError(interaction, 'Please select a category channel.');
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await updateTicketConfig(interaction.guild.id, {
        categoryId: category.id,
        closeCategoryId: closedCategory?.id || null,
        panelChannelId: panelChannel.id,
        transcriptChannelId: transcriptChannel.id,
        logChannelId: logChannel?.id || null,
        maxTicketsPerUser: maxOpen,
        staffRoles: [staffRole.id],
        pingRoles: [staffRole.id],
        pingOnCreate: true,
        mentionUser: true
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket System Setup**\n\nOpen Category: ${category.name}\nClosed Category: ${closedCategory?.name || 'Not set'}\nPanel Channel: ${panelChannel}\nStaff Role: ${staffRole}\nTranscript Channel: ${transcriptChannel}\nLog Channel: ${logChannel || 'Not set'}\nMax Open Tickets: ${maxOpen}\n\nUse \`/tickets panel\` to send the ticket panel.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Setup error:', error);
      await replyError(interaction, 'Failed to setup ticket system.');
    }
  },

  async handlePanel(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getTicketConfig(interaction.guild.id);

      if (!config.panelChannelId) {
        return replyError(interaction, 'Please run `/tickets setup` first.');
      }

      const panelChannel = await interaction.guild.channels.fetch(config.panelChannelId);

      if (!panelChannel) {
        return replyError(interaction, 'Panel channel not found. Please run setup again.');
      }

      // Delete old panel if exists
      if (config.panelMessageId) {
        try {
          const oldMessage = await panelChannel.messages.fetch(config.panelMessageId);
          await oldMessage.delete();
        } catch (err) {
          // Message already deleted or not found
        }
      }
      const panelContainer = buildPanelContainer(config);
      const panelMessage = await panelChannel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [panelContainer]
      });

      // Save panel message ID
      await updateTicketConfig(interaction.guild.id, {
        panelMessageId: panelMessage.id
      });

      const confirmContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Panel Created**\n\nTicket panel has been sent to ${panelChannel}`)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [confirmContainer]
      });
    } catch (error) {
      console.error('Panel error:', error);
      await replyError(interaction, 'Failed to create ticket panel.');
    }
  },

  async handleClose(interaction, client) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      if (ticket.status === 'closed') {
        return replyError(interaction, 'This ticket is already closed.');
      }

      await closeTicket(ticket, interaction.user.id, reason);
      const config = await getTicketConfig(interaction.guild.id);
      const closeAction = await archiveOrDeleteTicketChannel(interaction.channel, ticket, config);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Closed**\n\nClosed by: ${interaction.user}\nReason: ${reason}\n\nThis channel was ${closeAction}.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      // Generate and send transcript
      if (config.transcriptChannelId) {
        try {
          const transcriptChannel = await interaction.guild.channels.fetch(config.transcriptChannelId);
          const transcriptFile = await generateTranscript(ticket, interaction.guild);

          await transcriptChannel.send({
            content: `**Ticket #${ticket.ticketNumber} Transcript**\n\nUser: ${ticket.userName}\nClosed by: ${interaction.user.tag}\nReason: ${reason}`,
            files: [transcriptFile]
          });
        } catch (err) {
          console.error('Failed to send transcript:', err);
        }
      }

      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Closed',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel.name})\nClosed by: ${interaction.user.tag} (${interaction.user.id})\nReason: ${reason}`
      );
    } catch (error) {
      console.error('Close error:', error);
      await replyError(interaction, 'Failed to close ticket.');
    }
  },

  async handleClaim(interaction, client) {
    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      if (ticket.claimedBy) {
        return replyError(interaction, `This ticket is already claimed by <@${ticket.claimedBy}>`);
      }

      await claimTicket(ticket, interaction.user);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Claimed**\n\n${interaction.user} has claimed this ticket.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Claimed',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nClaimed by: ${interaction.user.tag} (${interaction.user.id})`
      );
    } catch (error) {
      console.error('Claim error:', error);
      await replyError(interaction, 'Failed to claim ticket.');
    }
  },

  async handleUnclaim(interaction, client) {
    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      if (!ticket.claimedBy) {
        return replyError(interaction, 'This ticket is not claimed.');
      }

      if (ticket.claimedBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return replyError(interaction, 'Only the claimer or administrators can unclaim this ticket.');
      }

      await unclaimTicket(ticket);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Unclaimed**\n\nThis ticket is now available for other staff members.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Unclaimed',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nUnclaimed by: ${interaction.user.tag} (${interaction.user.id})`
      );
    } catch (error) {
      console.error('Unclaim error:', error);
      await replyError(interaction, 'Failed to unclaim ticket.');
    }
  },

  async handleAdd(interaction, client) {
    const user = interaction.options.getUser('user');

    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      await interaction.channel.permissionOverwrites.create(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User Added**\n\n${user} has been added to this ticket.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket User Added',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nAdded user: ${user.tag} (${user.id})\nAdded by: ${interaction.user.tag} (${interaction.user.id})`
      );
    } catch (error) {
      console.error('Add user error:', error);
      await replyError(interaction, 'Failed to add user to ticket.');
    }
  },

  async handleRemove(interaction, client) {
    const user = interaction.options.getUser('user');

    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      if (user.id === ticket.userId) {
        return replyError(interaction, 'You cannot remove the ticket owner.');
      }

      await interaction.channel.permissionOverwrites.delete(user.id);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**User Removed**\n\n${user} has been removed from this ticket.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket User Removed',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nRemoved user: ${user.tag} (${user.id})\nRemoved by: ${interaction.user.tag} (${interaction.user.id})`
      );
    } catch (error) {
      console.error('Remove user error:', error);
      await replyError(interaction, 'Failed to remove user from ticket.');
    }
  },

  async handlePriority(interaction, client) {
    const level = interaction.options.getString('level');

    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      await setPriority(ticket, level);

      const priorityEmojis = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
      };

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Priority Updated**\n\n${priorityEmojis[level]} Priority set to: **${level.toUpperCase()}**`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Priority Updated',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nUpdated by: ${interaction.user.tag} (${interaction.user.id})\nPriority: ${level.toUpperCase()}`
      );
    } catch (error) {
      console.error('Priority error:', error);
      await replyError(interaction, 'Failed to set priority.');
    }
  },

  async handleTranscript(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const ticket = await getTicketByChannel(interaction.channel.id);

      if (!ticket) {
        return replyError(interaction, 'This is not a ticket channel.');
      }

      const transcriptFile = await generateTranscript(ticket, interaction.guild);

      await interaction.editReply({
        content: `**Transcript Generated**\n\nTicket #${ticket.ticketNumber}\nUser: ${ticket.userName}`,
        components: [],
        files: [transcriptFile]
      });

      const config = await getTicketConfig(interaction.guild.id);
      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Transcript Generated',
        `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nGenerated by: ${interaction.user.tag} (${interaction.user.id})`,
        [transcriptFile]
      );
    } catch (error) {
      console.error('Transcript error:', error);
      await replyError(interaction, 'Failed to generate transcript.');
    }
  },

  async handleList(interaction, client) {
    const statusFilter = interaction.options.getString('status') || 'open';

    await interaction.deferReply({ ephemeral: true });

    try {
      const tickets = await getAllTickets(
        interaction.guild.id,
        statusFilter === 'all' ? null : statusFilter
      );

      if (tickets.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**No Tickets Found**\n\nNo ${statusFilter} tickets found.`)
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const lines = [`**Ticket List** (${statusFilter})\n`];

      tickets.slice(0, 20).forEach(ticket => {
        const priorityEmojis = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          urgent: '🔴'
        };

        const status = ticket.status === 'open' ? '🟢 Open' : '🔴 Closed';
        const claimed = ticket.claimedBy ? `👤 ${ticket.claimedByName}` : '⚪ Unclaimed';

        lines.push(
          `**#${ticket.ticketNumber}** ${priorityEmojis[ticket.priority]} | ${status} | ${claimed}\n` +
          `User: ${ticket.userName} | Category: ${ticket.category}\n` +
          `Created: <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
        );
      });

      if (tickets.length > 20) {
        lines.push(`\n*Showing 20 of ${tickets.length} tickets*`);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(lines.join('\n'))
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('List error:', error);
      await replyError(interaction, 'Failed to list tickets.');
    }
  },

  async handleConfig(interaction, client) {
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');

    await interaction.deferReply({ ephemeral: true });

    try {
      const updates = {};

      switch (setting) {
        case 'max_tickets':
          const maxTickets = parseInt(value);
          if (isNaN(maxTickets) || maxTickets < 1 || maxTickets > 10) {
            return replyError(interaction, 'Max tickets must be between 1 and 10.');
          }
          updates.maxTicketsPerUser = maxTickets;
          break;

        case 'welcome':
          updates.welcomeMessage = value;
          break;

        case 'title':
          updates.panelTitle = value;
          break;

        case 'description':
          updates.panelDescription = value;
          break;

        case 'button_label':
          updates.buttonLabel = value;
          break;

        case 'button_emoji':
          updates.buttonEmoji = value;
          break;

        case 'button_style':
          const style = normalizeButtonStyle(value);
          if (!style) {
            return replyError(interaction, 'Button style must be: Primary, Secondary, Success, or Danger');
          }
          updates.buttonStyle = style;
          break;

        case 'close_label':
          updates.closeButtonLabel = value;
          break;

        case 'close_emoji':
          updates.closeButtonEmoji = value;
          break;

        case 'claim_label':
          updates.claimButtonLabel = value;
          break;

        case 'claim_emoji':
          updates.claimButtonEmoji = value;
          break;

        case 'unclaim_label':
          updates.unclaimButtonLabel = value;
          break;

        case 'unclaim_emoji':
          updates.unclaimButtonEmoji = value;
          break;

        case 'panel_image':
          updates.panelImage = value.toLowerCase() === 'none' ? null : value;
          break;

        case 'panel_thumbnail':
          updates.panelThumbnail = value.toLowerCase() === 'none' ? null : value;
          break;

        case 'ticket_name':
          if (!value.includes('{number}')) {
            return replyError(interaction, 'Ticket name format must include `{number}`.');
          }
          updates.ticketNameFormat = value;
          break;

        case 'transcript_channel':
          updates.transcriptChannelId = value.toLowerCase() === 'none' ? null : value.replace(/[<#>]/g, '');
          break;

        case 'close_category':
          updates.closeCategoryId = value.toLowerCase() === 'none' ? null : value.replace(/[<#>]/g, '');
          break;

        case 'log_channel':
          updates.logChannelId = value.toLowerCase() === 'none' ? null : value.replace(/[<#>]/g, '');
          break;

        case 'mention_user':
          updates.mentionUser = parseBoolean(value);
          break;

        case 'ping_on_create':
          updates.pingOnCreate = parseBoolean(value);
          break;

        case 'show_claim':
          updates.showClaimButton = parseBoolean(value);
          break;

        case 'show_close':
          updates.showCloseButton = parseBoolean(value);
          break;

        case 'show_transcript':
          updates.showTranscriptButton = parseBoolean(value);
          break;

      }

      for (const [field, fallback] of Object.entries(EMOJI_UPDATE_FIELDS)) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
          if (!isDiscordEmoji(updates[field])) {
            return replyError(interaction, 'Please provide a valid Unicode emoji or Discord custom emoji.');
          }

          updates[field] = normalizeDiscordEmoji(updates[field], fallback);
        }
      }

      await updateTicketConfig(interaction.guild.id, updates);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Configuration Updated**\n\nSetting: ${setting.replace(/_/g, ' ')}\nNew Value: ${value}\n\n*Use \`/tickets panel\` to update the panel with new settings.*`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Config error:', error);
      await replyError(interaction, 'Failed to update configuration.');
    }
  },

  async handleCategory(interaction, client) {
    const action = interaction.options.getString('action');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getTicketConfig(interaction.guild.id);

      if (action === 'list') {
        if (config.categories.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('**No Categories**\n\nNo ticket categories configured.')
            );

          return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        }

        const lines = ['**Ticket Categories**\n'];
        config.categories.forEach(cat => {
          lines.push(`${cat.emoji || '🎫'} **${cat.name}** (ID: ${cat.id})\n${cat.description}`);
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n'))
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'add') {
        const id = interaction.options.getString('id');
        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description') || 'No description';
        const buttonStyle = interaction.options.getString('button_style')
          ? normalizeButtonStyle(interaction.options.getString('button_style'))
          : 'Primary';
        const emojiInput = interaction.options.getString('emoji');
        const categoryEmoji = normalizeDiscordEmoji(emojiInput, '🎫');
        if (!id || !name) {
          return replyError(interaction, 'Please provide both ID and name for the category.');
        }

        if (emojiInput && !isDiscordEmoji(emojiInput)) {
          return replyError(interaction, 'Please provide a valid Unicode emoji or Discord custom emoji.');
        }

        if (!buttonStyle) {
          return replyError(interaction, 'Button style must be: Primary, Secondary, Success, or Danger');
        }

        if (config.categories.some(c => c.id === id)) {
          return replyError(interaction, 'A category with this ID already exists.');
        }

        config.categories.push({
          id,
          name,
          description,
          emoji: categoryEmoji,
          buttonStyle,
          staffRoles: []
        });

        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Category Added**\n\n${categoryEmoji} **${name}**\nID: ${id}\nDescription: ${description}`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'remove') {
        const id = interaction.options.getString('id');

        if (!id) {
          return replyError(interaction, 'Please provide the category ID to remove.');
        }

        const index = config.categories.findIndex(c => c.id === id);

        if (index === -1) {
          return replyError(interaction, 'Category not found.');
        }

        const removed = config.categories.splice(index, 1)[0];
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Category Removed**\n\n${removed.emoji || '🎫'} **${removed.name}** has been removed.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }
    } catch (error) {
      console.error('Category error:', error);
      await replyError(interaction, 'Failed to manage categories.');
    }
  },

  async handleStaff(interaction, client) {
    const action = interaction.options.getString('action');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getTicketConfig(interaction.guild.id);

      if (action === 'list') {
        if (config.staffRoles.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('**No Staff Roles**\n\nNo staff roles configured.')
            );

          return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        }

        const lines = ['**Staff Roles**\n'];
        for (const roleId of config.staffRoles) {
          lines.push(`<@&${roleId}>`);
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n'))
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const role = interaction.options.getRole('role');

      if (!role) {
        return replyError(interaction, 'Please provide a role.');
      }

      if (action === 'add') {
        if (config.staffRoles.includes(role.id)) {
          return replyError(interaction, 'This role is already a staff role.');
        }

        config.staffRoles.push(role.id);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Staff Role Added**\n\n${role} has been added as a staff role.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'remove') {
        const index = config.staffRoles.indexOf(role.id);

        if (index === -1) {
          return replyError(interaction, 'This role is not a staff role.');
        }

        config.staffRoles.splice(index, 1);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Staff Role Removed**\n\n${role} has been removed from staff roles.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }
    } catch (error) {
      console.error('Staff error:', error);
      await replyError(interaction, 'Failed to manage staff roles.');
    }
  },

  async handlePingRole(interaction, client) {
    const action = interaction.options.getString('action');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getTicketConfig(interaction.guild.id);

      if (action === 'list') {
        if (config.pingRoles.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('**No Ping Roles**\n\nNo ping roles configured.')
            );

          return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        }

        const lines = ['**Ping Roles**\n\nThese roles will be pinged when a new ticket is created:\n'];
        for (const roleId of config.pingRoles) {
          lines.push(`<@&${roleId}>`);
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n'))
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const role = interaction.options.getRole('role');

      if (!role) {
        return replyError(interaction, 'Please provide a role.');
      }

      if (action === 'add') {
        if (config.pingRoles.includes(role.id)) {
          return replyError(interaction, 'This role is already a ping role.');
        }

        config.pingRoles.push(role.id);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Ping Role Added**\n\n${role} will now be pinged when new tickets are created.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'remove') {
        const index = config.pingRoles.indexOf(role.id);

        if (index === -1) {
          return replyError(interaction, 'This role is not a ping role.');
        }

        config.pingRoles.splice(index, 1);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Ping Role Removed**\n\n${role} will no longer be pinged when tickets are created.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }
    } catch (error) {
      console.error('Ping role error:', error);
      await replyError(interaction, 'Failed to manage ping roles.');
    }
  },

  async handleClosePrefix(message, args, client) {
    const reason = args.join(' ') || 'No reason provided';

    try {
      const ticket = await getTicketByChannel(message.channel.id);

      if (!ticket) {
        return replyError(message, 'This is not a ticket channel.');
      }

      if (ticket.status === 'closed') {
        return replyError(message, 'This ticket is already closed.');
      }

      await closeTicket(ticket, message.author.id, reason);
      const config = await getTicketConfig(message.guild.id);
      const closeAction = await archiveOrDeleteTicketChannel(message.channel, ticket, config);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Closed**\n\nClosed by: ${message.author}\nReason: ${reason}\n\nThis channel was ${closeAction}.`
          )
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      // Generate and send transcript
      if (config.transcriptChannelId) {
        try {
          const transcriptChannel = await message.guild.channels.fetch(config.transcriptChannelId);
          const transcriptFile = await generateTranscript(ticket, message.guild);

          await transcriptChannel.send({
            content: `**Ticket #${ticket.ticketNumber} Transcript**\n\nUser: ${ticket.userName}\nClosed by: ${message.author.tag}\nReason: ${reason}`,
            files: [transcriptFile]
          });
        } catch (err) {
          console.error('Failed to send transcript:', err);
        }
      }

      await sendTicketLog(
        message.guild,
        config,
        'Ticket Closed',
        `Ticket: #${ticket.ticketNumber} (${message.channel.name})\nClosed by: ${message.author.tag} (${message.author.id})\nReason: ${reason}`
      );
    } catch (error) {
      console.error('Close error:', error);
      await replyError(message, 'Failed to close ticket.');
    }
  },

  async handleClaimPrefix(message, args, client) {
    try {
      const ticket = await getTicketByChannel(message.channel.id);

      if (!ticket) {
        return replyError(message, 'This is not a ticket channel.');
      }

      if (ticket.claimedBy) {
        return replyError(message, `This ticket is already claimed by <@${ticket.claimedBy}>`);
      }

      await claimTicket(ticket, message.author);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Claimed**\n\n${message.author} has claimed this ticket.`
          )
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(message.guild.id);
      await sendTicketLog(
        message.guild,
        config,
        'Ticket Claimed',
        `Ticket: #${ticket.ticketNumber} (${message.channel})\nClaimed by: ${message.author.tag} (${message.author.id})`
      );
    } catch (error) {
      console.error('Claim error:', error);
      await replyError(message, 'Failed to claim ticket.');
    }
  },

  async handleUnclaimPrefix(message, args, client) {
    try {
      const ticket = await getTicketByChannel(message.channel.id);

      if (!ticket) {
        return replyError(message, 'This is not a ticket channel.');
      }

      if (!ticket.claimedBy) {
        return replyError(message, 'This ticket is not claimed.');
      }

      if (ticket.claimedBy !== message.author.id && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return replyError(message, 'Only the claimer or administrators can unclaim this ticket.');
      }

      await unclaimTicket(ticket);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Unclaimed**\n\nThis ticket is now available for other staff members.`
          )
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      const config = await getTicketConfig(message.guild.id);
      await sendTicketLog(
        message.guild,
        config,
        'Ticket Unclaimed',
        `Ticket: #${ticket.ticketNumber} (${message.channel})\nUnclaimed by: ${message.author.tag} (${message.author.id})`
      );
    } catch (error) {
      console.error('Unclaim error:', error);
      await replyError(message, 'Failed to unclaim ticket.');
    }
  },

  async handleTranscriptPrefix(message, args, client) {
    try {
      const ticket = await getTicketByChannel(message.channel.id);

      if (!ticket) {
        return replyError(message, 'This is not a ticket channel.');
      }

      const transcriptFile = await generateTranscript(ticket, message.guild);

      await message.reply({
        content: `**Transcript Generated**\n\nTicket #${ticket.ticketNumber}\nUser: ${ticket.userName}`,
        files: [transcriptFile]
      });

      const config = await getTicketConfig(message.guild.id);
      await sendTicketLog(
        message.guild,
        config,
        'Ticket Transcript Generated',
        `Ticket: #${ticket.ticketNumber} (${message.channel})\nGenerated by: ${message.author.tag} (${message.author.id})`,
        [transcriptFile]
      );
    } catch (error) {
      console.error('Transcript error:', error);
      await replyError(message, 'Failed to generate transcript.');
    }
  },

  async handleListPrefix(message, args, client) {
    const statusFilter = args[0] || 'open';

    try {
      const tickets = await getAllTickets(
        message.guild.id,
        statusFilter === 'all' ? null : statusFilter
      );

      if (tickets.length === 0) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**No Tickets Found**\n\nNo ${statusFilter} tickets found.`)
          );

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const lines = [`**Ticket List** (${statusFilter})\n`];

      tickets.slice(0, 20).forEach(ticket => {
        const priorityEmojis = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          urgent: '🔴'
        };

        const status = ticket.status === 'open' ? '🟢 Open' : '🔴 Closed';
        const claimed = ticket.claimedBy ? `👤 ${ticket.claimedByName}` : '⚪ Unclaimed';

        lines.push(
          `**#${ticket.ticketNumber}** ${priorityEmojis[ticket.priority]} | ${status} | ${claimed}\n` +
          `User: ${ticket.userName} | Category: ${ticket.category}\n` +
          `Created: <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`
        );
      });

      if (tickets.length > 20) {
        lines.push(`\n*Showing 20 of ${tickets.length} tickets*`);
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(lines.join('\n'))
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('List error:', error);
      await replyError(message, 'Failed to list tickets.');
    }
  }
};
