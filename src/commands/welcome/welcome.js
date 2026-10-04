const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const { getWelcomeConfig, updateWelcomeConfig, replacePlaceholders } = require('../../utils/welcome');
const { createWelcomeCard } = require('../../utils/welcomeCard');

module.exports = {
  category: 'Welcome',
  name: 'welcome',
  description: 'Welcome system management',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Welcome system management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup the welcome system')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send welcome messages')
            .addChannelTypes(0) // GuildText
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the welcome system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('background')
        .setDescription('Change the welcome card background image')
        .addAttachmentOption(option =>
          option
            .setName('image')
            .setDescription('Image file to use as the welcome card background')
        )
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('Image URL or local path, for example ./public/wallpaper.png')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('autorole')
        .setDescription('Manage auto roles')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
              { name: 'Toggle', value: 'toggle' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to add/remove')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the welcome message')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current welcome configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await this.handleSetup(interaction, client);
        break;
      case 'toggle':
        await this.handleToggle(interaction, client);
        break;
      case 'background':
        await this.handleBackground(interaction, client);
        break;
      case 'autorole':
        await this.handleAutoRole(interaction, client);
        break;
      case 'test':
        await this.handleTest(interaction, client);
        break;
      case 'status':
        await this.handleStatus(interaction, client);
        break;
      default:
        await replyError(interaction, 'Unknown subcommand.');
    }
  },

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      return replyError(message, 'Please specify a subcommand. Use `help welcome` for more info.');
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permission to use welcome commands.');
    }

    switch (subcommand) {
      case 'test':
        await this.handleTestPrefix(message, args.slice(1), client);
        break;
      case 'status':
        await this.handleStatusPrefix(message, args.slice(1), client);
        break;
      default:
        await replyError(message, 'Unknown subcommand. Available: test, status');
    }
  },

  async handleSetup(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    await interaction.deferReply({ ephemeral: true });

    try {
      await updateWelcomeConfig(interaction.guild.id, {
        channelId: channel.id,
        enabled: true
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Welcome System Setup**\n\nWelcome channel: ${channel}\nStatus: Enabled\n\nUse \`/welcome test\` to preview the welcome card.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Setup error:', error);
      await replyError(interaction, 'Failed to setup welcome system.');
    }
  },

  async handleToggle(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');

    await interaction.deferReply({ ephemeral: true });

    try {
      await updateWelcomeConfig(interaction.guild.id, { enabled });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Welcome System ${enabled ? 'Enabled' : 'Disabled'}**\n\nThe welcome system is now ${enabled ? 'active' : 'inactive'}.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Toggle error:', error);
      await replyError(interaction, 'Failed to toggle welcome system.');
    }
  },

  async handleBackground(interaction, client) {
    const image = interaction.options.getAttachment('image');
    const url = interaction.options.getString('url')?.trim();
    const backgroundUrl = image?.url || url;

    await interaction.deferReply({ ephemeral: true });

    try {
      if (!backgroundUrl) {
        return replyError(interaction, 'Please provide an image attachment or a URL/path.');
      }

      if (image && image.contentType && !image.contentType.startsWith('image/')) {
        return replyError(interaction, 'Please upload an image file.');
      }

      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('./') && !url.startsWith('../')) {
        return replyError(interaction, 'Use a valid image URL or local path like `./public/wallpaper.png`.');
      }

      await updateWelcomeConfig(interaction.guild.id, {
        backgroundUrl
      });

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Welcome Background Updated**\n\nBackground: ${backgroundUrl}\n\nUse \`/welcome test\` to preview it.`
          )
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Background update error:', error);
      await replyError(interaction, 'Failed to update welcome background.');
    }
  },

  async handleConfig(interaction, client) {
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');

    await interaction.deferReply({ ephemeral: true });

    try {
      const updates = {};

      switch (setting) {
        case 'title':
          updates.title = value;
          break;

        case 'message':
          updates.message = value;
          break;

        case 'color':
          // Remove # if present
          const color = value.replace('#', '');
          if (!/^[0-9A-F]{6}$/i.test(color)) {
            return replyError(interaction, 'Invalid color format. Use hex color without # (e.g., 5865F2)');
          }
          updates.color = color;
          break;

        case 'background':
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return replyError(interaction, 'Background must be a valid URL starting with http:// or https://');
          }
          updates.backgroundUrl = value;
          break;

        case 'text':
          updates.textMessage = value;
          break;

        case 'mention':
          const mention = value.toLowerCase() === 'true' || value === '1';
          updates.mentionUser = mention;
          break;

        case 'dm_message':
          updates.dmMessage = value;
          break;

        case 'dm_enabled':
          const dmEnabled = value.toLowerCase() === 'true' || value === '1';
          updates.dmEnabled = dmEnabled;
          break;
      }

      await updateWelcomeConfig(interaction.guild.id, updates);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Configuration Updated**\n\nSetting: ${setting.replace(/_/g, ' ')}\nNew Value: ${value}\n\n*Use \`/welcome test\` to preview your changes.*\n\n**Available Placeholders:**\n\`{user}\` - Username\n\`{mention}\` - User mention\n\`{server}\` - Server name\n\`{memberCount}\` - Member count\n\`{tag}\` - User tag`
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


  async handleAutoRole(interaction, client) {
    const action = interaction.options.getString('action');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getWelcomeConfig(interaction.guild.id);

      if (action === 'list') {
        if (config.autoRoles.length === 0) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('**No Auto Roles**\n\nNo auto roles configured.')
            );

          return interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
        }

        const lines = ['**Auto Roles**\n\nRoles automatically assigned to new members:\n'];
        for (const roleId of config.autoRoles) {
          lines.push(`<@&${roleId}>`);
        }
        lines.push(`\n**Status:** ${config.autoRoleEnabled ? 'Enabled' : 'Disabled'}`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n'))
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'toggle') {
        config.autoRoleEnabled = !config.autoRoleEnabled;
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Auto Role ${config.autoRoleEnabled ? 'Enabled' : 'Disabled'}**\n\nAuto role assignment is now ${config.autoRoleEnabled ? 'active' : 'inactive'}.`
            )
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
        if (config.autoRoles.includes(role.id)) {
          return replyError(interaction, 'This role is already an auto role.');
        }

        config.autoRoles.push(role.id);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Auto Role Added**\n\n${role} will now be automatically assigned to new members.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }

      if (action === 'remove') {
        const index = config.autoRoles.indexOf(role.id);

        if (index === -1) {
          return replyError(interaction, 'This role is not an auto role.');
        }

        config.autoRoles.splice(index, 1);
        await config.save();

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Auto Role Removed**\n\n${role} will no longer be automatically assigned.`
            )
          );

        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      }
    } catch (error) {
      console.error('Auto role error:', error);
      await replyError(interaction, 'Failed to manage auto roles.');
    }
  },

  async handleTest(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getWelcomeConfig(interaction.guild.id);

      if (!config.channelId) {
        return replyError(interaction, 'Please run `/welcome setup` first.');
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);

      if (!channel) {
        return replyError(interaction, 'Welcome channel not found. Please run setup again.');
      }

      // Create test welcome card with custom canvas
      try {
        const message = replacePlaceholders(config.message, interaction.member, interaction.guild);

        const card = await createWelcomeCard({
          username: interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          message: message,
          backgroundUrl: config.backgroundUrl,
          avatarSize: config.avatarSize,
          avatarX: config.avatarX,
          avatarY: config.avatarY,
          usernameColor: config.usernameColor,
          usernameSize: config.usernameSize,
          usernameY: config.usernameY,
          welcomeTextColor: config.welcomeTextColor,
          welcomeTextSize: config.welcomeTextSize,
          welcomeTextY: config.welcomeTextY,
          messageColor: config.messageColor,
          messageSize: config.messageSize,
          messageY: config.messageY,
          backgroundBlur: config.backgroundBlur,
          overlayDarkness: config.overlayDarkness,
          bottomGradientHeight: config.bottomGradientHeight,
          bottomGradientOpacity: config.bottomGradientOpacity
        });

        const textMessage = config.mentionUser
          ? replacePlaceholders(config.textMessage, interaction.member, interaction.guild).replace('{user}', `<@${interaction.user.id}>`)
          : replacePlaceholders(config.textMessage, interaction.member, interaction.guild);

        await channel.send({
          content: `**[TEST]** ${textMessage}`,
          files: [{
            attachment: card,
            name: `welcome-test-${interaction.user.id}.png`
          }]
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Test Welcome Sent**\n\nA test welcome message has been sent to ${channel}`
            )
          );

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });
      } catch (cardError) {
        console.error('Card generation error:', cardError);
        return replyError(interaction, `Failed to generate welcome card: ${cardError.message}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      await replyError(interaction, 'Failed to send test welcome message.');
    }
  },

  async handleStatus(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getWelcomeConfig(interaction.guild.id);

      const channel = config.channelId ? `<#${config.channelId}>` : 'Not set';
      const autoRoleStatus = config.autoRoleEnabled ? 'Enabled' : 'Disabled';
      const autoRoleCount = config.autoRoles.length;
      const dmStatus = config.dmEnabled ? 'Enabled' : 'Disabled';

      const content = [
        `**Welcome System Status**\n`,
        `**Status:** ${config.enabled ? 'Enabled' : 'Disabled'}`,
        `**Channel:** ${channel}`,
        `\n**Card Settings:**`,
        `Title: ${config.title}`,
        `Message: ${config.message}`,
        `Color: #${config.color}`,
        `Background: ${config.backgroundUrl ? 'Custom' : 'Default'}`,
        `\n**Text Message:**`,
        `${config.textMessage}`,
        `Mention User: ${config.mentionUser ? 'Yes' : 'No'}`,
        `\n**Auto Role:**`,
        `Status: ${autoRoleStatus}`,
        `Roles: ${autoRoleCount}`,
        `\n**DM Settings:**`,
        `Status: ${dmStatus}`,
        `Message: ${config.dmMessage}`
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Status error:', error);
      await replyError(interaction, 'Failed to get welcome status.');
    }
  },

  async handleTestPrefix(message, args, client) {
    try {
      const config = await getWelcomeConfig(message.guild.id);

      if (!config.channelId) {
        return replyError(message, 'Please run setup first.');
      }

      const channel = message.guild.channels.cache.get(config.channelId);

      if (!channel) {
        return replyError(message, 'Welcome channel not found.');
      }

      try {
        const messageText = replacePlaceholders(config.message, message.member, message.guild);

        const card = await createWelcomeCard({
          username: message.author.username,
          avatarUrl: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
          message: messageText,
          backgroundUrl: config.backgroundUrl,
          avatarSize: config.avatarSize,
          avatarX: config.avatarX,
          avatarY: config.avatarY,
          usernameColor: config.usernameColor,
          usernameSize: config.usernameSize,
          usernameY: config.usernameY,
          welcomeTextColor: config.welcomeTextColor,
          welcomeTextSize: config.welcomeTextSize,
          welcomeTextY: config.welcomeTextY,
          messageColor: config.messageColor,
          messageSize: config.messageSize,
          messageY: config.messageY,
          backgroundBlur: config.backgroundBlur,
          overlayDarkness: config.overlayDarkness,
          bottomGradientHeight: config.bottomGradientHeight,
          bottomGradientOpacity: config.bottomGradientOpacity
        });

        const textMessage = config.mentionUser
          ? replacePlaceholders(config.textMessage, message.member, message.guild).replace('{user}', `<@${message.author.id}>`)
          : replacePlaceholders(config.textMessage, message.member, message.guild);

        await channel.send({
          content: `**[TEST]** ${textMessage}`,
          files: [{
            attachment: card,
            name: `welcome-test-${message.author.id}.png`
          }]
        });

        await message.reply(`Test welcome sent to ${channel}`);
      } catch (cardError) {
        console.error('Card generation error:', cardError);
        await replyError(message, `Failed to generate welcome card.`);
      }
    } catch (error) {
      console.error('Test error:', error);
      await replyError(message, 'Failed to send test welcome message.');
    }
  },

  async handleStatusPrefix(message, args, client) {
    try {
      const config = await getWelcomeConfig(message.guild.id);

      const channel = config.channelId ? `<#${config.channelId}>` : 'Not set';
      const content = [
        `**Welcome System Status**\n`,
        `Status: ${config.enabled ? 'Enabled' : 'Disabled'}`,
        `Channel: ${channel}`,
        `Title: ${config.title}`,
        `Message: ${config.message}`,
        `Color: #${config.color}`,
        `Auto Role: ${config.autoRoleEnabled ? 'Enabled' : 'Disabled'} (${config.autoRoles.length} roles)`,
        `DM: ${config.dmEnabled ? 'Enabled' : 'Disabled'}`
      ].join('\n');

      await message.reply(content);
    } catch (error) {
      console.error('Status error:', error);
      await replyError(message, 'Failed to get welcome status.');
    }
  }
};
