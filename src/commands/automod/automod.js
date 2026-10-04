const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getAutoModConfig, updateAutoModConfig } = require('../../utils/automod');
const { replyError, replyWithCard } = require('../../utils/respond');

module.exports = {
  category: 'Automod',
  name: 'automod',
  description: 'Automod configuration commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Automod configuration commands')
    .addSubcommand(subcommand =>
      subcommand.setName('status').setDescription('View current automod configuration'))
    .addSubcommand(subcommand =>
      subcommand.setName('antispam').setDescription('Configure anti-spam settings')
        .addStringOption(option => option.setName('action').setDescription('Enable or disable').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' },
            { name: 'Configure', value: 'configure' }))
        .addIntegerOption(option => option.setName('max_messages').setDescription('Max messages in time window').setMinValue(2).setMaxValue(20))
        .addIntegerOption(option => option.setName('time_window').setDescription('Time window in seconds').setMinValue(1).setMaxValue(60)))
    .addSubcommand(subcommand =>
      subcommand.setName('antilink').setDescription('Configure anti-link settings')
        .addStringOption(option => option.setName('action').setDescription('Enable or disable').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' }))
        .addStringOption(option => option.setName('punishment').setDescription('Punishment type')
          .addChoices(
            { name: 'Delete', value: 'delete' },
            { name: 'Warn', value: 'warn' },
            { name: 'Mute', value: 'mute' })))
    .addSubcommand(subcommand =>
      subcommand.setName('antiinvite').setDescription('Configure anti-invite settings')
        .addStringOption(option => option.setName('action').setDescription('Enable or disable').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' }))
        .addStringOption(option => option.setName('punishment').setDescription('Punishment type')
          .addChoices(
            { name: 'Delete', value: 'delete' },
            { name: 'Warn', value: 'warn' },
            { name: 'Mute', value: 'mute' })))
    .addSubcommand(subcommand =>
      subcommand.setName('badwords').setDescription('Configure bad words filter')
        .addStringOption(option => option.setName('action').setDescription('Action to perform').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' },
            { name: 'Add Word', value: 'add' },
            { name: 'Remove Word', value: 'remove' },
            { name: 'List Words', value: 'list' }))
        .addStringOption(option => option.setName('word').setDescription('Word to add or remove')))
    .addSubcommand(subcommand =>
      subcommand.setName('anticaps').setDescription('Configure anti-caps settings')
        .addStringOption(option => option.setName('action').setDescription('Enable or disable').setRequired(true)
          .addChoices(
            { name: 'Enable', value: 'enable' },
            { name: 'Disable', value: 'disable' }))
        .addIntegerOption(option => option.setName('percentage').setDescription('Max caps percentage').setMinValue(50).setMaxValue(100)))
    .addSubcommand(subcommand =>
      subcommand.setName('ignore').setDescription('Add ignored channel or role')
        .addStringOption(option => option.setName('type').setDescription('Type to ignore').setRequired(true)
          .addChoices(
            { name: 'Channel', value: 'channel' },
            { name: 'Role', value: 'role' }))
        .addStringOption(option => option.setName('id').setDescription('Channel or Role ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('unignore').setDescription('Remove ignored channel or role')
        .addStringOption(option => option.setName('type').setDescription('Type to unignore').setRequired(true)
          .addChoices(
            { name: 'Channel', value: 'channel' },
            { name: 'Role', value: 'role' }))
        .addStringOption(option => option.setName('id').setDescription('Channel or Role ID').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('logchannel').setDescription('Set automod log channel')
        .addChannelOption(option => option.setName('channel').setDescription('Log channel').setRequired(true))),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) return replyError(message, 'Please specify a subcommand. Use `!automod status` to view configuration.');

    switch (subcommand) {
      case 'status':
      case 'config':
        return this.handleStatus(message, args.slice(1), client, true);
      case 'antispam':
      case 'spam':
        return this.handleAntiSpam(message, args.slice(1), client, true);
      case 'antilink':
      case 'links':
        return this.handleAntiLink(message, args.slice(1), client, true);
      case 'antiinvite':
      case 'invites':
        return this.handleAntiInvite(message, args.slice(1), client, true);
      case 'badwords':
      case 'filter':
        return this.handleBadWords(message, args.slice(1), client, true);
      case 'anticaps':
      case 'caps':
        return this.handleAntiCaps(message, args.slice(1), client, true);
      case 'ignore':
        return this.handleIgnore(message, args.slice(1), client, true);
      case 'unignore':
        return this.handleUnignore(message, args.slice(1), client, true);
      case 'logchannel':
      case 'log':
        return this.handleLogChannel(message, args.slice(1), client, true);
      default:
        return replyError(message, `Unknown subcommand: ${subcommand}`);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'status':
        return this.handleStatus(interaction, [], client, false);
      case 'antispam':
        return this.handleAntiSpam(interaction, [], client, false);
      case 'antilink':
        return this.handleAntiLink(interaction, [], client, false);
      case 'antiinvite':
        return this.handleAntiInvite(interaction, [], client, false);
      case 'badwords':
        return this.handleBadWords(interaction, [], client, false);
      case 'anticaps':
        return this.handleAntiCaps(interaction, [], client, false);
      case 'ignore':
        return this.handleIgnore(interaction, [], client, false);
      case 'unignore':
        return this.handleUnignore(interaction, [], client, false);
      case 'logchannel':
        return this.handleLogChannel(interaction, [], client, false);
    }
  },

  // Handlers will be added in next steps
  async handleStatus(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      const embed = {
        color: 0x5865F2,
        title: 'Automod Configuration',
        description: 'Current automod settings for this server',
        fields: [
          {
            name: 'Anti-Spam',
            value: config.antiSpam.enabled
              ? `Enabled (${config.antiSpam.maxMessages} msgs/${config.antiSpam.timeWindow / 1000}s)`
              : 'Disabled',
            inline: true
          },
          {
            name: 'Anti-Link',
            value: config.antiLink.enabled ? `Enabled (${config.antiLink.action})` : 'Disabled',
            inline: true
          },
          {
            name: 'Anti-Invite',
            value: config.antiInvite.enabled ? `Enabled (${config.antiInvite.action})` : 'Disabled',
            inline: true
          },
          {
            name: 'Bad Words',
            value: config.badWords.enabled ? `Enabled (${config.badWords.words.length} words)` : 'Disabled',
            inline: true
          },
          {
            name: 'Anti-Caps',
            value: config.antiCaps.enabled ? `Enabled (${config.antiCaps.percentage}%)` : 'Disabled',
            inline: true
          },
          {
            name: 'Log Channel',
            value: config.logChannel ? `<#${config.logChannel}>` : 'Not set',
            inline: true
          },
          {
            name: 'Ignored Channels',
            value: config.ignoredChannels.length > 0 ? `${config.ignoredChannels.length} channel(s)` : 'None',
            inline: true
          },
          {
            name: 'Ignored Roles',
            value: config.ignoredRoles.length > 0 ? `${config.ignoredRoles.length} role(s)` : 'None',
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Automod status error:', error);
      await replyError(target, 'I could not fetch the automod configuration.');
    }
  },

  async handleAntiSpam(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const action = isPrefix ? args[0]?.toLowerCase() : target.options.getString('action');

    if (!action) {
      return replyError(target, 'Please specify an action: enable, disable, or configure.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (action === 'enable') {
        config.antiSpam.enabled = true;
        await config.save();

        return replyWithCard(target, {
          color: 0x00ff00,
          title: 'Anti-Spam Enabled',
          description: `Anti-spam protection is now active.\nMax messages: ${config.antiSpam.maxMessages}\nTime window: ${config.antiSpam.timeWindow / 1000}s`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'disable') {
        config.antiSpam.enabled = false;
        await config.save();

        return replyWithCard(target, {
          color: 0xff0000,
          title: 'Anti-Spam Disabled',
          description: 'Anti-spam protection is now inactive.',
          timestamp: new Date().toISOString()
        });
      } else if (action === 'configure') {
        const maxMessages = isPrefix ? parseInt(args[1]) : target.options.getInteger('max_messages');
        const timeWindow = isPrefix ? parseInt(args[2]) : target.options.getInteger('time_window');

        if (maxMessages) config.antiSpam.maxMessages = maxMessages;
        if (timeWindow) config.antiSpam.timeWindow = timeWindow * 1000;

        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Anti-Spam Configured',
          description: `Settings updated.\nMax messages: ${config.antiSpam.maxMessages}\nTime window: ${config.antiSpam.timeWindow / 1000}s`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Anti-spam error:', error);
      await replyError(target, 'I could not update anti-spam settings.');
    }
  },

  async handleAntiLink(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const action = isPrefix ? args[0]?.toLowerCase() : target.options.getString('action');
    const punishment = isPrefix ? args[1]?.toLowerCase() : target.options.getString('punishment');

    if (!action) {
      return replyError(target, 'Please specify an action: enable or disable.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (action === 'enable') {
        config.antiLink.enabled = true;
        if (punishment) config.antiLink.action = punishment;
        await config.save();

        return replyWithCard(target, {
          color: 0x00ff00,
          title: 'Anti-Link Enabled',
          description: `Link filtering is now active.\nAction: ${config.antiLink.action}`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'disable') {
        config.antiLink.enabled = false;
        await config.save();

        return replyWithCard(target, {
          color: 0xff0000,
          title: 'Anti-Link Disabled',
          description: 'Link filtering is now inactive.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Anti-link error:', error);
      await replyError(target, 'I could not update anti-link settings.');
    }
  },

  async handleAntiInvite(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const action = isPrefix ? args[0]?.toLowerCase() : target.options.getString('action');
    const punishment = isPrefix ? args[1]?.toLowerCase() : target.options.getString('punishment');

    if (!action) {
      return replyError(target, 'Please specify an action: enable or disable.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (action === 'enable') {
        config.antiInvite.enabled = true;
        if (punishment) config.antiInvite.action = punishment;
        await config.save();

        return replyWithCard(target, {
          color: 0x00ff00,
          title: 'Anti-Invite Enabled',
          description: `Invite filtering is now active.\nAction: ${config.antiInvite.action}`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'disable') {
        config.antiInvite.enabled = false;
        await config.save();

        return replyWithCard(target, {
          color: 0xff0000,
          title: 'Anti-Invite Disabled',
          description: 'Invite filtering is now inactive.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Anti-invite error:', error);
      await replyError(target, 'I could not update anti-invite settings.');
    }
  },

  async handleBadWords(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const action = isPrefix ? args[0]?.toLowerCase() : target.options.getString('action');
    const word = isPrefix ? args[1] : target.options.getString('word');

    if (!action) {
      return replyError(target, 'Please specify an action: enable, disable, add, remove, or list.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (action === 'enable') {
        config.badWords.enabled = true;
        await config.save();

        return replyWithCard(target, {
          color: 0x00ff00,
          title: 'Bad Words Filter Enabled',
          description: `Bad words filter is now active.\nFiltered words: ${config.badWords.words.length}`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'disable') {
        config.badWords.enabled = false;
        await config.save();

        return replyWithCard(target, {
          color: 0xff0000,
          title: 'Bad Words Filter Disabled',
          description: 'Bad words filter is now inactive.',
          timestamp: new Date().toISOString()
        });
      } else if (action === 'add') {
        if (!word) {
          return replyError(target, 'Please provide a word to add.');
        }

        if (config.badWords.words.includes(word.toLowerCase())) {
          return replyError(target, 'This word is already in the filter.');
        }

        config.badWords.words.push(word.toLowerCase());
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Word Added',
          description: `Added "${word}" to the bad words filter.\nTotal words: ${config.badWords.words.length}`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'remove') {
        if (!word) {
          return replyError(target, 'Please provide a word to remove.');
        }

        const index = config.badWords.words.indexOf(word.toLowerCase());
        if (index === -1) {
          return replyError(target, 'This word is not in the filter.');
        }

        config.badWords.words.splice(index, 1);
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Word Removed',
          description: `Removed "${word}" from the bad words filter.\nTotal words: ${config.badWords.words.length}`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'list') {
        if (config.badWords.words.length === 0) {
          return replyWithCard(target, {
            color: 0x5865F2,
            title: 'Bad Words List',
            description: 'No words in the filter.',
            timestamp: new Date().toISOString()
          });
        }

        const wordList = config.badWords.words.map((w, i) => `${i + 1}. ||${w}||`).join('\n');

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Bad Words List',
          description: `${config.badWords.words.length} word(s) in filter:\n${wordList}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Bad words error:', error);
      await replyError(target, 'I could not update bad words settings.');
    }
  },

  async handleAntiCaps(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const action = isPrefix ? args[0]?.toLowerCase() : target.options.getString('action');
    const percentage = isPrefix ? parseInt(args[1]) : target.options.getInteger('percentage');

    if (!action) {
      return replyError(target, 'Please specify an action: enable or disable.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (action === 'enable') {
        config.antiCaps.enabled = true;
        if (percentage) config.antiCaps.percentage = percentage;
        await config.save();

        return replyWithCard(target, {
          color: 0x00ff00,
          title: 'Anti-Caps Enabled',
          description: `Caps filtering is now active.\nMax percentage: ${config.antiCaps.percentage}%`,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'disable') {
        config.antiCaps.enabled = false;
        await config.save();

        return replyWithCard(target, {
          color: 0xff0000,
          title: 'Anti-Caps Disabled',
          description: 'Caps filtering is now inactive.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Anti-caps error:', error);
      await replyError(target, 'I could not update anti-caps settings.');
    }
  },

  async handleIgnore(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const type = isPrefix ? args[0]?.toLowerCase() : target.options.getString('type');
    const id = isPrefix ? args[1] : target.options.getString('id');

    if (!type || !id) {
      return replyError(target, 'Please specify type (channel/role) and ID.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (type === 'channel') {
        if (config.ignoredChannels.includes(id)) {
          return replyError(target, 'This channel is already ignored.');
        }

        config.ignoredChannels.push(id);
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Channel Ignored',
          description: `<#${id}> is now ignored by automod.`,
          timestamp: new Date().toISOString()
        });
      } else if (type === 'role') {
        if (config.ignoredRoles.includes(id)) {
          return replyError(target, 'This role is already ignored.');
        }

        config.ignoredRoles.push(id);
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Role Ignored',
          description: `<@&${id}> is now ignored by automod.`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Ignore error:', error);
      await replyError(target, 'I could not add to ignore list.');
    }
  },

  async handleUnignore(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const type = isPrefix ? args[0]?.toLowerCase() : target.options.getString('type');
    const id = isPrefix ? args[1] : target.options.getString('id');

    if (!type || !id) {
      return replyError(target, 'Please specify type (channel/role) and ID.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);

      if (type === 'channel') {
        const index = config.ignoredChannels.indexOf(id);
        if (index === -1) {
          return replyError(target, 'This channel is not ignored.');
        }

        config.ignoredChannels.splice(index, 1);
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Channel Unignored',
          description: `<#${id}> is no longer ignored by automod.`,
          timestamp: new Date().toISOString()
        });
      } else if (type === 'role') {
        const index = config.ignoredRoles.indexOf(id);
        if (index === -1) {
          return replyError(target, 'This role is not ignored.');
        }

        config.ignoredRoles.splice(index, 1);
        await config.save();

        return replyWithCard(target, {
          color: 0x5865F2,
          title: 'Role Unignored',
          description: `<@&${id}> is no longer ignored by automod.`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Unignore error:', error);
      await replyError(target, 'I could not remove from ignore list.');
    }
  },

  async handleLogChannel(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.ManageGuild)
      : target.member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      return replyError(target, 'You need Manage Server permission to use this command.');
    }

    const channel = isPrefix
      ? target.mentions.channels.first()
      : target.options.getChannel('channel');

    if (!channel) {
      return replyError(target, 'Please mention a channel.');
    }

    try {
      const config = await getAutoModConfig(target.guild.id);
      config.logChannel = channel.id;
      await config.save();

      return replyWithCard(target, {
        color: 0x5865F2,
        title: 'Log Channel Set',
        description: `Automod logs will be sent to ${channel}.`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Log channel error:', error);
      await replyError(target, 'I could not set the log channel.');
    }
  },
};
