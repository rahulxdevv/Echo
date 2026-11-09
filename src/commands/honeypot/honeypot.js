const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const emojis = require('../../utils/emojis');
const {
  getHoneypotConfig,
  updateHoneypotConfig,
  invalidateCache,
  actionText,
} = require('../../utils/honeypot');
const { replyError, replyNotice } = require('../../utils/respond');

function hasPerm(target) {
  const member = target.member || target.guild?.members?.me;
  if (target.member?.permissions?.has) {
    return (
      target.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      target.member.permissions.has(PermissionFlagsBits.Administrator)
    );
  }
  return false;
}

function isChannelId(raw) {
  if (!raw) return false;
  const cleaned = String(raw).replace(/[<#>]/g, '').trim();
  return /^\d{15,22}$/.test(cleaned);
}

async function resolveChannel(guild, raw) {
  const id = String(raw || '').replace(/[<#>]/g, '').trim();
  if (!id) return null;
  return guild.channels.fetch(id).catch(() => null);
}

function configLines(config) {
  const status = config.enabled ? 'Enabled' : 'Disabled (not active)';
  const channel = config.channelId ? `<#${config.channelId}>` : 'Not set';
  const logChannel = config.logChannelId ? `<#${config.logChannelId}>` : 'Not set';
  return [
    `${emojis.honeypot} **Honeypot** - ${status}`,
    ``,
    `**Trap channel:** ${channel}`,
    `**Log channel:** ${logChannel}`,
    `**Action:** ${config.action} (${actionText(config.action)})`,
    `**DM on trigger:** ${config.noDM ? 'Off' : 'On'}`,
    `**Warning message:** ${config.noWarning ? 'Off' : 'On'}`,
    `**Forward message to logs:** ${config.forwardMessage ? 'On' : 'Off'}`,
    `**Reinvite in DM:** ${config.reinvite ? 'On' : 'Off'}`,
    `**Total moderations:** ${config.moderationCount || 0}`,
  ].join('\n');
}

module.exports = {
  category: 'Moderation',
  name: 'honeypot',
  description: 'Honeypot spam-bot trap - ban spammers who post in a trap channel',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Honeypot spam-bot trap - ban spammers who post in a trap channel')
    .addSubcommand(sub =>
      sub.setName('setup').setDescription('Enable the honeypot trap channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Trap channel (any message here triggers). Leave empty to create #honeypot').setRequired(false))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Where to log triggers').setRequired(false))
        .addStringOption(opt => opt.setName('action').setDescription('What to do on trigger')
          .addChoices(
            { name: 'Softban (ban+unban, wipe messages)', value: 'softban' },
            { name: 'Ban (permanent, wipe messages)', value: 'ban' },
            { name: 'Kick', value: 'kick' },
            { name: 'Delete only (disabled)', value: 'disabled' }
          ))
        )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View current honeypot configuration'))
    .addSubcommand(sub =>
      sub.setName('action').setDescription('Set the trigger action')
        .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true)
          .addChoices(
            { name: 'Softban (ban+unban)', value: 'softban' },
            { name: 'Ban', value: 'ban' },
            { name: 'Kick', value: 'kick' },
            { name: 'Delete only', value: 'disabled' }
          )))
    .addSubcommand(sub =>
      sub.setName('channel').setDescription('Set or clear the trap channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Trap channel, or leave empty to clear').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('log').setDescription('Set or clear the log channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Log channel, or leave empty to clear').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('messages').setDescription('Customize warning / DM / log messages')
        .addStringOption(opt => opt.setName('warning').setDescription('Warning message (supports {{action:text}} etc.)'))
        .addStringOption(opt => opt.setName('dm').setDescription('DM message'))
        .addStringOption(opt => opt.setName('log').setDescription('Log message (must contain {{user:mention}} or {{user:id}})'))
        .addBooleanOption(opt => opt.setName('reset').setDescription('Reset all messages to defaults')))
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable the honeypot trap'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable the honeypot trap')),

  async executePrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();
    return this.route(message, sub || 'status', args.slice(1), client, true);
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    return this.route(interaction, sub, [], client, false);
  },

  async route(target, sub, args = [], client, isPrefix) {
    const guildId = target.guild?.id;
    if (!guildId) return replyError(target, `${emojis.honeypot} Honeypot can only be used in a server.`);

    if (!hasPerm(target)) {
      return replyError(target, `${emojis.honeypot} You need **Manage Server** permission to configure the honeypot.`);
    }

    try {
      const config = await getHoneypotConfig(guildId);

      switch (sub) {
        case 'setup':
          return await this.handleSetup(target, args, client, isPrefix, config);
        case 'status':
        case 'config':
        case 'view':
          return await replyNotice(target, configLines(config));
        case 'action': {
          let action;
          if (isPrefix) {
            action = args[0]?.toLowerCase();
          } else {
            action = target.options.getString('action');
          }
          if (!['softban', 'ban', 'kick', 'disabled'].includes(action)) {
            return replyError(target, `${emojis.honeypot} Action must be \`softban\`, \`ban\`, \`kick\`, or \`disabled\`.`);
          }
          const updated = await updateHoneypotConfig(guildId, { action });
          return replyNotice(target, `${emojis.status.success} Honeypot action is now **${updated.action}** (${actionText(updated.action)}).`);
        }
        case 'channel':
        case 'trap': {
          let channel = null;
          if (isPrefix) {
            if (args[0]) {
              if (!isChannelId(args[0])) return replyError(target, `${emojis.honeypot} Please mention a channel like \`#honeypot\` or paste its ID.`);
              channel = await resolveChannel(target.guild, args[0]);
            }
          } else {
            channel = target.options.getChannel('channel');
          }
          const updated = await updateHoneypotConfig(guildId, {
            channelId: channel ? channel.id : null,
            enabled: channel ? true : config.enabled,
          });
          invalidateCache(guildId);
          return replyNotice(target, channel
            ? `${emojis.status.success} Trap channel set to ${channel} - honeypot is **enabled**. Any message there triggers **${updated.action}**.`
            : `${emojis.status.success} Trap channel cleared. Honeypot will not trigger.`);
        }
        case 'log': {
          let channel = null;
          if (isPrefix) {
            if (args[0]) {
              if (!isChannelId(args[0])) return replyError(target, `${emojis.honeypot} Please mention a channel or paste its ID.`);
              channel = await resolveChannel(target.guild, args[0]);
            }
          } else {
            channel = target.options.getChannel('channel');
          }
          await updateHoneypotConfig(guildId, { logChannelId: channel ? channel.id : null });
          return replyNotice(target, channel
            ? `${emojis.status.success} Honeypot logs will go to ${channel}.`
            : `${emojis.status.success} Honeypot log channel cleared.`);
        }
        case 'messages':
          return await this.handleMessages(target, args, isPrefix);
        case 'enable': {
          if (!config.channelId) {
            return replyError(target, `${emojis.honeypot} Set a trap channel first: \`/honeypot setup\` or \`!honeypot setup #honeypot\`.`);
          }
          await updateHoneypotConfig(guildId, { enabled: true });
          return replyNotice(target, `${emojis.status.success} Honeypot trap is **enabled**.`);
        }
        case 'disable':
        case 'off': {
          await updateHoneypotConfig(guildId, { enabled: false });
          return replyNotice(target, `${emojis.status.success} Honeypot trap is **disabled**.`);
        }
        default:
          return replyError(target, `${emojis.honeypot} Unknown subcommand. Try \`setup\`, \`status\`, \`action\`, \`channel\`, \`log\`, \`messages\`, \`enable\`, or \`disable\`.`);
      }
    } catch (error) {
      console.error('Honeypot error:', error);
      await replyError(target, `${emojis.honeypot} Something went wrong configuring the honeypot. Please try again.`);
    }
  },

  async handleSetup(target, args, client, isPrefix, config) {
    let channel = null;
    let logChannel = null;
    let action = null;

    if (isPrefix) {
      // Positional: first channel mention = trap, second = log. Flags: --action --log
      const channelArg = args.find(a => isChannelId(a));
      if (channelArg) channel = await resolveChannel(target.guild, channelArg);

      const logFlagIndex = args.indexOf('--log');
      if (logFlagIndex !== -1 && args[logFlagIndex + 1] && isChannelId(args[logFlagIndex + 1])) {
        logChannel = await resolveChannel(target.guild, args[logFlagIndex + 1]);
      } else if (args.length > 1) {
        const ids = args.filter(a => isChannelId(a));
        if (ids.length > 1) logChannel = await resolveChannel(target.guild, ids[1]);
      }

      const actionFlagIndex = args.indexOf('--action');
      if (actionFlagIndex !== -1 && args[actionFlagIndex + 1]) {
        action = args[actionFlagIndex + 1].toLowerCase();
      }
    } else {
      channel = target.options.getChannel('channel');
      logChannel = target.options.getChannel('log_channel');
      action = target.options.getString('action');
    }

    if (action && !['softban', 'ban', 'kick', 'disabled'].includes(action)) {
      return replyError(target, `${emojis.honeypot} Action must be \`softban\`, \`ban\`, \`kick\`, or \`disabled\`.`);
    }

    // Copy channel perms for the upcoming message. If no channel given, try to use/create #honeypot.
    if (!channel) {
      const existing = target.guild.channels.cache.find(c => c.name === 'honeypot' && c.type === ChannelType.GuildText);
      if (existing) {
        channel = existing;
      } else {
        // Try to create one.
        const me = target.guild.members.me;
        const canManage = me?.permissions?.has(PermissionFlagsBits.ManageChannels);
        if (!canManage) {
          return replyError(target, `${emojis.honeypot} I couldn't create a \`#honeypot\` channel - I need **Manage Channels**. Please create one and run \`/honeypot setup\` with that channel.`);
        }
        channel = await target.guild.channels.create({
          name: 'honeypot',
          type: ChannelType.GuildText,
          topic: `Honeypot trap - do not talk here. Messages are punished (${action || config.action || 'softban'}).`,
          reason: 'Honeypot trap channel',
        }).catch(() => null);
        if (!channel) {
          return replyError(target, `${emojis.honeypot} I couldn't create the \`#honeypot\` channel. Please try again or create it manually.`);
        }
      }
    }

    const updates = {
      channelId: channel.id,
      enabled: true,
    };
    if (logChannel) updates.logChannelId = logChannel.id;
    if (action) updates.action = action;

    const updated = await updateHoneypotConfig(target.guild.id, updates);
    invalidateCache(target.guild.id);

    // Post + pin warning so the trap looks "alive" and legit users stay away.
    const { buildDefaultWarning } = require('../../utils/honeypot');
    if (!updated.noWarning) {
      const warn = buildDefaultWarning(updated.action);
      const warnMsg = await channel.send(warn).catch(() => null);
      if (warnMsg) await warnMsg.pin().catch(() => null);
    }

    // If no log channel configured, warn about it.
    const logNote = updated.logChannelId ? `Logs → ${updated.logChannelId}` : 'No log channel set - set one with `/honeypot log` to track triggers.';
    const acting = actionText(updated.action);

    return replyNotice(
      target,
      `${emojis.status.success} Honeypot is live in ${channel}!\n` +
      `Any message in that channel gets **${acting}** and the last hour of their messages are wiped.\n` +
      `${logNote}\n` +
      `Note: Your bot role must be **above** regular members or bans will fail - move it up in role settings.`
    );
  },

  async handleMessages(target, args, isPrefix) {
    const guildId = target.guild.id;
    const config = await getHoneypotConfig(guildId);

    if (!isPrefix) {
      const reset = target.options.getBoolean('reset');
      const warning = target.options.getString('warning');
      const dm = target.options.getString('dm');
      const log = target.options.getString('log');

      if (reset) {
        await updateHoneypotConfig(guildId, { warningMessage: null, dmMessage: null, logMessage: null });
        return replyNotice(target, `${emojis.status.success} Honeypot messages reset to defaults.`);
      }

      if (warning === null && dm === null && log === null) {
        return replyNotice(
          target,
          `${emojis.honeypot} **Current custom messages**\n` +
          `**Warning:** ${config.warningMessage ? config.warningMessage.slice(0, 200) + (config.warningMessage.length > 200 ? '…' : '') : 'default'}\n` +
          `**DM:** ${config.dmMessage ? config.dmMessage.slice(0, 200) + (config.dmMessage.length > 200 ? '…' : '') : 'default'}\n` +
          `**Log:** ${config.logMessage ? config.logMessage.slice(0, 200) + (config.logMessage.length > 200 ? '…' : '') : 'default'}\n\n` +
          `Variables: \`{{action:text}}\`, \`{{user:mention}}\`, \`{{user:id}}\`, \`{{user:name}}\`, \`{{server:name}}\`, \`{{honeypot:channel:mention}}\`, \`{{honeypot:channel:link}}\`.\n` +
          `Log message must contain \`{{user:mention}}\` or \`{{user:id}}\`.`
        );
      }

      const updates = {};
      if (warning !== null) updates.warningMessage = warning || null;
      if (dm !== null) updates.dmMessage = dm || null;
      if (log !== null) updates.logMessage = log || null;

      if (updates.logMessage && !updates.logMessage.includes('{{user:mention}}') && !updates.logMessage.includes('{{user:id}}')) {
        return replyError(target, `${emojis.honeypot} Log message must include \`{{user:mention}}\` or \`{{user:id}}\` so moderators see who triggered.`);
      }

      await updateHoneypotConfig(guildId, updates);
      return replyNotice(target, `${emojis.status.success} Honeypot messages updated.`);
    }

    // Prefix version expects flags: --warning "...", --dm "...", --log "...", --reset
    if (args.includes('--reset')) {
      await updateHoneypotConfig(guildId, { warningMessage: null, dmMessage: null, logMessage: null });
      return replyNotice(target, `${emojis.status.success} Honeypot messages reset to defaults.`);
    }

    const parseFlag = (flag) => {
      const idx = args.indexOf(flag);
      if (idx === -1 || !args[idx + 1]) return undefined;
      return args[idx + 1];
    };

    const warning = parseFlag('--warning');
    const dm = parseFlag('--dm');
    const log = parseFlag('--log');

    if (warning === undefined && dm === undefined && log === undefined) {
      return replyNotice(
        target,
        `${emojis.honeypot} **Current custom messages**\n` +
        `**Warning:** ${config.warningMessage ? config.warningMessage.slice(0, 200) + (config.warningMessage.length > 200 ? '…' : '') : 'default'}\n` +
        `**DM:** ${config.dmMessage ? config.dmMessage.slice(0, 200) + (config.dmMessage.length > 200 ? '…' : '') : 'default'}\n` +
        `**Log:** ${config.logMessage ? config.logMessage.slice(0, 200) + (config.logMessage.length > 200 ? '…' : '') : 'default'}\n\n` +
        `Usage: \`!honeypot messages --warning "..." --dm "..." --log "..."\` or \`--reset\`.`
      );
    }

    const updates = {};
    if (warning !== undefined) updates.warningMessage = warning;
    if (dm !== undefined) updates.dmMessage = dm;
    if (log !== undefined) updates.logMessage = log;

    if (updates.logMessage && !updates.logMessage.includes('{{user:mention}}') && !updates.logMessage.includes('{{user:id}}')) {
      return replyError(target, `${emojis.honeypot} Log message must include \`{{user:mention}}\` or \`{{user:id}}\`.`);
    }

    await updateHoneypotConfig(guildId, updates);
    return replyNotice(target, `${emojis.status.success} Honeypot messages updated.`);
  },
};
