const { replyError } = require('../utils/respond');
const {
  addParticipant,
  removeParticipant,
  getGiveawayByMessageId,
  formatTimeRemaining,
  buildGiveawayContainer
} = require('../utils/giveaway');
const ticketInteraction = require('./ticketInteraction');
const suggestionInteraction = require('./suggestionInteraction');
const verificationInteraction = require('./verificationInteraction');
const {
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle suggestion buttons
    if (interaction.isButton() && interaction.customId.startsWith('suggestion_')) {
      return await suggestionInteraction.handleVote(interaction, client);
    }
    // Handle verification interactions
    if ((interaction.isButton() || interaction.isModalSubmit()) && interaction.customId.startsWith('verify_')) {
      return await verificationInteraction.execute(interaction, client);
    }
    // Handle ticket buttons
    if (interaction.isButton() && interaction.customId.startsWith('ticket-')) {
      try {
        if (interaction.customId.startsWith('ticket-create:')) {
          return await ticketInteraction.handleTicketCreate(interaction, client);
        } else if (interaction.customId === 'ticket-close') {
          return await ticketInteraction.handleTicketClose(interaction, client);
        } else if (interaction.customId === 'ticket-close-confirm') {
          return await ticketInteraction.handleTicketCloseConfirm(interaction, client);
        } else if (interaction.customId === 'ticket-close-cancel') {
          return await ticketInteraction.handleTicketCloseCancel(interaction, client);
        } else if (interaction.customId === 'ticket-claim') {
          return await ticketInteraction.handleTicketClaim(interaction, client);
        } else if (interaction.customId === 'ticket-unclaim') {
          return await ticketInteraction.handleTicketUnclaim(interaction, client);
        } else if (interaction.customId === 'ticket-transcript') {
          return await ticketInteraction.handleTicketTranscript(interaction, client);
        } else if (interaction.customId.startsWith('ticket-priority:')) {
          return await ticketInteraction.handleTicketPriority(interaction, client);
        }
      } catch (error) {
        console.error('Ticket button error:', error);
        return interaction.reply({ content: 'Something went wrong. Please try again.', ephemeral: true });
      }
    }

    if (interaction.isButton() && interaction.customId === 'giveaway_enter') {
      try {
        const giveaway = await getGiveawayByMessageId(interaction.message.id);

        if (!giveaway) {
          return interaction.reply({ content: 'This giveaway no longer exists.', ephemeral: true });
        }

        if (giveaway.ended) {
          return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
        }

        const result = await addParticipant(interaction.message.id, interaction.user.id);

        if (!result) {
          return interaction.reply({ content: 'Could not enter the giveaway.', ephemeral: true });
        }

        if (result.alreadyEntered) {
          const removeResult = await removeParticipant(interaction.message.id, interaction.user.id);

          if (removeResult && removeResult.wasParticipant) {
            const container = buildGiveawayContainer({
              prize: removeResult.giveaway.prize,
              winners: removeResult.giveaway.winners,
              endTime: removeResult.giveaway.endTime,
              hostId: removeResult.giveaway.hostId,
              participantsCount: removeResult.giveaway.participants.length,
              isEnded: false,
              banner: removeResult.giveaway.banner,
              thumbnail: removeResult.giveaway.thumbnail
            });

            await interaction.message.edit({
              flags: MessageFlags.IsComponentsV2,
              components: [container]
            });

            return interaction.reply({ content: 'You have left the giveaway.', ephemeral: true });
          }
        } else {
          const container = buildGiveawayContainer({
            prize: result.giveaway.prize,
            winners: result.giveaway.winners,
            endTime: result.giveaway.endTime,
            hostId: result.giveaway.hostId,
            participantsCount: result.giveaway.participants.length,
            isEnded: false,
            banner: result.giveaway.banner,
            thumbnail: result.giveaway.thumbnail
          });

          await interaction.message.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });

          return interaction.reply({ content: 'You have entered the giveaway! Click again to leave.', ephemeral: true });
        }
      } catch (error) {
        console.error('Giveaway button error:', error);
        return interaction.reply({ content: 'Something went wrong. Please try again.', ephemeral: true });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('bot-modal:')) {
      const type = interaction.customId.split(':')[1];
      const content = interaction.fields.getTextInputValue('content');
      const botCommand = client.slashCommands.get('bot') || client.commands.get('bot');
      if (botCommand?.submitReport) {
        return await botCommand.submitReport(interaction, type, content, client, interaction.user);
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help-category:')) {
      const helpCommand = client.slashCommands.get('help') || client.commands.get('help');

      if (!helpCommand?.handleCategorySelect) return;

      try {
        await helpCommand.handleCategorySelect(interaction, client);
      } catch (error) {
        console.error('Error handling help menu selection:', error);
        await replyError(interaction, 'I could not update the help menu right now.');
      }

      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('help-page:')) {
      const helpCommand = client.slashCommands.get('help') || client.commands.get('help');

      if (!helpCommand?.handlePageButton) return;

      try {
        await helpCommand.handlePageButton(interaction, client);
      } catch (error) {
        console.error('Error handling help page button:', error);
        await replyError(interaction, 'I could not update the help page right now.');
      }

      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.executeSlash(interaction, client);

      // Log command usage
      const logChannelId = process.env.COMMAND_LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
          const invite = interaction.guild ? await interaction.channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null) : null;
          const content = [
            `# ${emojis.categories.info} Command Used\n`,
            `**Command:** \`/${interaction.commandName}\``,
            `**User:** ${interaction.user.tag} (\`${interaction.user.id}\`)`,
            `**Server:** ${interaction.guild?.name || 'DM'} (\`${interaction.guildId || 'N/A'}\`)`,
            `**Invite:** ${invite ? invite.url : 'No Permission/DM'}`
          ].join('\n');
          const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
          await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [container] }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error executing slash command:', error);
      await replyError(interaction, 'Something went wrong while running that command. Please try again in a moment.');
    }
  }
};


