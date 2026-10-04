const {
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const emojis = require('../utils/emojis');
const {
  getTicketConfig,
  getTicketByChannel,
  createTicket,
  closeTicket,
  claimTicket,
  unclaimTicket,
  setPriority,
  generateTranscript,
  sendTicketLog
} = require('../utils/tickets');
const { setButtonEmoji } = require('../utils/emoji');

function addButtonRows(container, rows) {
  rows
    .filter(row => row.length > 0)
    .forEach(row => {
      container.addActionRowComponents(actionRow => actionRow.setComponents(...row.slice(0, 5)));
    });

  return container;
}

function buildTicketControlRows(config) {
  const mainButtons = [];

  if (config.showClaimButton) {
    mainButtons.push(
      setButtonEmoji(new ButtonBuilder()
        .setCustomId('ticket-claim')
        .setLabel((config.claimButtonLabel || 'Claim').slice(0, 80))
        .setStyle(ButtonStyle.Success),
      config.claimButtonEmoji, emojis.economy.claim),
      setButtonEmoji(new ButtonBuilder()
        .setCustomId('ticket-unclaim')
        .setLabel((config.unclaimButtonLabel || 'Unclaim').slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
      config.unclaimButtonEmoji, emojis.economy.unclaim)
    );
  }

  if (config.showCloseButton) {
    mainButtons.push(
      setButtonEmoji(new ButtonBuilder()
        .setCustomId('ticket-close')
        .setLabel((config.closeButtonLabel || 'Close').slice(0, 80))
        .setStyle(ButtonStyle.Danger),
      config.closeButtonEmoji, emojis.mod.lock)
    );
  }

  if (config.showTranscriptButton !== false) {
    mainButtons.splice(Math.max(mainButtons.length - 1, 0), 0,
      setButtonEmoji(new ButtonBuilder()
        .setCustomId('ticket-transcript')
        .setLabel((config.transcriptButtonLabel || 'Transcript').slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
      config.transcriptButtonEmoji, emojis.economy.transcript)
    );
  }

  return [mainButtons];
}

function buildTicketContainer(ticket, config, categoryInfo) {
  const welcomeContent = [
    `# Ticket #${ticket.ticketNumber}`,
    '',
    config.welcomeMessage,
    '',
    `**Category:** ${categoryInfo.name}`,
    '**Priority:** Medium',
    '**Status:** Open'
  ].join('\n');

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(welcomeContent));

  return addButtonRows(container, buildTicketControlRows(config));
}

function buildSimpleContainer(content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function buildCloseConfirmContainer(ticket) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Confirm Close**\n\nAre you sure you want to close ticket #${ticket.ticketNumber}?`
      )
    )
    .addActionRowComponents(actionRow =>
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId('ticket-close-confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket-close-cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

function isStaffMember(member, config) {
  return config.staffRoles.some(roleId => member.roles.cache.has(roleId)) ||
    member.permissions.has('Administrator');
}

function canManageClaimedTicket(interaction, ticket, config) {
  if (!isStaffMember(interaction.member, config)) {
    return {
      allowed: false,
      message: 'Only ticket staff can use this button.'
    };
  }

  if (ticket.claimedBy && ticket.claimedBy !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
    return {
      allowed: false,
      message: `This ticket is claimed by <@${ticket.claimedBy}>. They must unclaim it before other staff can manage it.`
    };
  }

  return { allowed: true };
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
    } catch (error) {
      console.error('Failed to delete ticket channel:', error);
    }
  }, 10000);

  return 'scheduled for deletion in 10 seconds';
}

module.exports = {
  name: 'ticketInteraction',
  async handleTicketCreate(interaction, client) {
    const [, category] = interaction.customId.split(':');

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await createTicket(interaction.guild, interaction.user, category);

      if (result.error) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Error**\n\n${result.error}`)
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      const { ticket, channel, config } = result;

      // Find category info
      const categoryInfo = config.categories.find(c => c.id === category) || { name: 'General' };

      const alertRoleIds = config.pingOnCreate
        ? [...new Set([...(config.pingRoles || []), ...(config.staffRoles || [])])]
        : [];
      const pingContent = [`<@${interaction.user.id}>`, ...alertRoleIds.map(roleId => `<@&${roleId}>`)].join(' ');

      if (pingContent.trim()) {
        const alertMessage = await channel.send({
          content: pingContent,
          allowedMentions: {
            users: [interaction.user.id],
            roles: alertRoleIds
          }
        });

        setTimeout(() => {
          alertMessage.delete().catch(() => null);
        }, 1500);
      }

      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [buildTicketContainer(ticket, config, categoryInfo)]
      });

      await sendTicketLog(
        interaction.guild,
        config,
        'Ticket Created',
        `Ticket: ${channel} (#${ticket.ticketNumber})\nUser: ${interaction.user.tag} (${interaction.user.id})\nCategory: ${categoryInfo.name}`
      );

      // Confirm to user
      const confirmContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Ticket Created**\n\nYour ticket has been created: ${channel}\nTicket #${ticket.ticketNumber}`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [confirmContainer]
      });
    } catch (error) {
      console.error('Ticket create error:', error);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('**Error**\n\nFailed to create ticket. Please contact an administrator.')
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  },

  async handleTicketClose(interaction, client) {
    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('This is not a ticket channel.')
            )
        ]
      });
    }

    const config = await getTicketConfig(interaction.guild.id);
    const access = canManageClaimedTicket(interaction, ticket, config);

    if (!access.allowed) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer(access.message)]
      });
    }

    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [buildCloseConfirmContainer(ticket)]
    });
  },

  async handleTicketCloseConfirm(interaction, client) {
    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.update({
        components: [buildSimpleContainer('This is not a ticket channel.')]
      });
    }

    const config = await getTicketConfig(interaction.guild.id);
    const access = canManageClaimedTicket(interaction, ticket, config);

    if (!access.allowed) {
      return interaction.update({
        components: [buildSimpleContainer(access.message)]
      });
    }

    await closeTicket(ticket, interaction.user.id, 'Closed from ticket button');
    const closeAction = await archiveOrDeleteTicketChannel(interaction.channel, ticket, config);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [
        buildSimpleContainer(
          `**Ticket Closed**\n\nClosed by: ${interaction.user}\nReason: Closed from ticket button\n\nThis channel was ${closeAction}.`
        )
      ]
    });

    if (config.transcriptChannelId) {
      try {
        const transcriptChannel = await interaction.guild.channels.fetch(config.transcriptChannelId);
        const transcriptFile = await generateTranscript(ticket, interaction.guild);

        await transcriptChannel.send({
          content: `**Ticket #${ticket.ticketNumber} Transcript**\n\nUser: ${ticket.userName}\nClosed by: ${interaction.user.tag}\nReason: Closed from ticket button`,
          files: [transcriptFile]
        });
      } catch (error) {
        console.error('Failed to send ticket transcript:', error);
      }
    }

    await sendTicketLog(
      interaction.guild,
      config,
      'Ticket Closed',
      `Ticket: #${ticket.ticketNumber} (${interaction.channel.name})\nClosed by: ${interaction.user.tag} (${interaction.user.id})\nReason: Closed from ticket button`
    );
  },

  async handleTicketCloseCancel(interaction, client) {
    return interaction.update({
      components: [buildSimpleContainer('Ticket close cancelled.')]
    });
  },

  async handleTicketClaim(interaction, client) {
    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('This is not a ticket channel.')
            )
        ]
      });
    }

    // Check if user is staff
    const config = await getTicketConfig(interaction.guild.id);
    const isStaff = isStaffMember(interaction.member, config);

    if (!isStaff) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('Only ticket staff can use this button.')]
      });
    }

    if (ticket.claimedBy) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`This ticket is already claimed by <@${ticket.claimedBy}>`)
            )
        ]
      });
    }

    await claimTicket(ticket, interaction.user);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        buildSimpleContainer(
          `**Ticket Claimed**\n\n${interaction.user} has claimed this ticket.`
        )
      ]
    });

    await sendTicketLog(
      interaction.guild,
      config,
      'Ticket Claimed',
      `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nClaimed by: ${interaction.user.tag} (${interaction.user.id})`
    );
  },

  async handleTicketUnclaim(interaction, client) {
    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('This is not a ticket channel.')]
      });
    }

    const config = await getTicketConfig(interaction.guild.id);
    const isStaff = isStaffMember(interaction.member, config);
    const isClaimer = ticket.claimedBy === interaction.user.id;

    if (!isStaff) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('Only ticket staff can use this button.')]
      });
    }

    if (!ticket.claimedBy) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('This ticket is not claimed.')]
      });
    }

    if (!isClaimer && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('Only the claimer or administrators can unclaim this ticket.')]
      });
    }

    await unclaimTicket(ticket);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        buildSimpleContainer(
          `**Ticket Unclaimed**\n\n${interaction.user} unclaimed this ticket.`
        )
      ]
    });

    await sendTicketLog(
      interaction.guild,
      config,
      'Ticket Unclaimed',
      `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nUnclaimed by: ${interaction.user.tag} (${interaction.user.id})`
    );
  },

  async handleTicketTranscript(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildSimpleContainer('This is not a ticket channel.')]
      });
    }

    const config = await getTicketConfig(interaction.guild.id);
    const access = canManageClaimedTicket(interaction, ticket, config);

    if (!access.allowed) {
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildSimpleContainer(access.message)]
      });
    }

    const transcriptFile = await generateTranscript(ticket, interaction.guild);

    await interaction.editReply({
      content: `**Transcript Generated**\n\nTicket #${ticket.ticketNumber}\nUser: ${ticket.userName}`,
      components: [],
      files: [transcriptFile]
    });

    await sendTicketLog(
      interaction.guild,
      config,
      'Ticket Transcript Generated',
      `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nGenerated by: ${interaction.user.tag} (${interaction.user.id})`,
      [transcriptFile]
    );
  },

  async handleTicketPriority(interaction, client) {
    const [, priority] = interaction.customId.split(':');
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!validPriorities.includes(priority)) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('Invalid priority selected.')]
      });
    }

    const ticket = await getTicketByChannel(interaction.channel.id);

    if (!ticket) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer('This is not a ticket channel.')]
      });
    }

    const config = await getTicketConfig(interaction.guild.id);
    const access = canManageClaimedTicket(interaction, ticket, config);

    if (!access.allowed) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [buildSimpleContainer(access.message)]
      });
    }

    await setPriority(ticket, priority);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        buildSimpleContainer(
          `**Priority Updated**\n\nPriority set to **${priority.toUpperCase()}**.`
        )
      ]
    });

    await sendTicketLog(
      interaction.guild,
      config,
      'Ticket Priority Updated',
      `Ticket: #${ticket.ticketNumber} (${interaction.channel})\nUpdated by: ${interaction.user.tag} (${interaction.user.id})\nPriority: ${priority.toUpperCase()}`
    );
  }
};
