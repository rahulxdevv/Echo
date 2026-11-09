const HoneypotConfig = require('../models/HoneypotConfig');
const { PermissionFlagsBits } = require('discord.js');
const emojis = require('./emojis');

// Tiny in-memory cache so messageCreate doesn't hit Mongo on every message.
const cache = new Map();
const CACHE_TTL = 30_000;

function getCached(guildId) {
  const entry = cache.get(guildId);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL) {
    cache.delete(guildId);
    return null;
  }
  return entry.config;
}

async function getHoneypotConfig(guildId) {
  const cached = getCached(guildId);
  if (cached) return cached;

  let config = await HoneypotConfig.findOne({ guildId });
  if (!config) {
    config = await HoneypotConfig.create({ guildId });
  }

  cache.set(guildId, { config, at: Date.now() });
  return config;
}

async function getOrCreateHoneypotConfig(guildId) {
  return getHoneypotConfig(guildId);
}

async function updateHoneypotConfig(guildId, updates) {
  const config = await HoneypotConfig.findOneAndUpdate(
    { guildId },
    { $set: updates, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  cache.set(guildId, { config, at: Date.now() });
  return config;
}

function invalidateCache(guildId) {
  cache.delete(guildId);
}

function resolveTemplate(template, vars = {}) {
  if (!template || typeof template !== 'string') return template;
  return template.replace(/{{(.+?)}}/g, (_, key) => {
    const k = key.trim();
    return vars[k] !== undefined && vars[k] !== null ? vars[k] : '';
  });
}

function actionText(action) {
  switch (action) {
    case 'ban': return 'banned';
    case 'softban': return 'softbanned';
    case 'kick': return 'kicked';
    default: return 'warned';
  }
}

function buildDefaultWarning(action) {
  const text = actionText(action);
  return `## ${emojis.trap} DO NOT SEND MESSAGES IN THIS CHANNEL\n\nThis channel is used to catch spam bots. Any messages sent here will result in you being **${text}**.`;
}

function buildDefaultDM({ userMention, serverName, action, honeypotLink }) {
  return [
    `## ${emojis.honeypot} Honeypot Triggered`,
    ``,
    `Hey ${userMention}, you have been **${actionText(action)}** from **${serverName}** for sending a message in the [honeypot](${honeypotLink}) channel.`,
    ``,
    `This may have happened if someone gained access to your account through malware, stolen sessions or leaked passwords.`,
    `Please recover your account, scan your device and reinstall your OS if needed.`,
  ].join('\n');
}

function buildDefaultLog({ userMention, userId, action, channelMention, created, joined }) {
  const createdPart = created ? ` • Created: ${created}` : '';
  const joinedPart = joined ? ` • Joined: ${joined}` : '';
  return `${userMention} was ${actionText(action)} for triggering the honeypot in ${channelMention}\n-# User ID: \`${userId}\`${createdPart}${joinedPart}`;
}

async function sendLog(logChannelId, content, { forwardContent = null } = {}) {
  return;
}

/**
 * Main honeypot trigger. Returns true if the message was in a honeypot channel
 * and handled (so caller should stop normal processing).
 */
async function handleHoneypotTrigger(message, client) {
  if (!message.guild || message.author.bot) return false;

  const config = await getHoneypotConfig(message.guild.id);
  if (!config?.enabled || !config.channelId) return false;
  if (message.channel.id !== config.channelId) return false;

  const guild = message.guild;
  const author = message.author;
  const member = message.member || await guild.members.fetch(author.id).catch(() => null);
  const action = config.action || 'softban';

  // Safety: never action the server owner or administrators.
  const isOwner = guild.ownerId === author.id;
  const hasAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
  const hasManageGuild = member?.permissions?.has(PermissionFlagsBits.ManageGuild);

  const forwardSnippet = config.forwardMessage
    ? message.content?.slice(0, 500) || '[no text / attachment]'
    : null;

  async function writeLog(text, { isFailure = false } = {}) {
    if (!config.logChannelId) return;
    try {
      const logChannel = await guild.channels.fetch(config.logChannelId).catch(() => null);
      if (!logChannel?.isTextBased()) return;
      let out = text;
      if (forwardSnippet) {
        out += `\n\n**Message:** ${forwardSnippet}`;
      }
      if (isFailure) {
        out = `${emojis.status.warning} Honeypot action failed.\n${out}`;
      }
      await logChannel.send(out).catch(() => null);
    } catch {
      // best effort
    }
  }

  if (isOwner || hasAdmin) {
    await writeLog(`${emojis.status.warning} Skipped honeypot for <@${author.id}> - server owner/admin detected.`);
    // Still remove the triggering message so the trap stays clean.
    await message.delete().catch(() => null);
    return true;
  }

  // Build template variables.
  const honeypotLink = message.url || '';
  const vars = {
    'user:mention': `<@${author.id}>`,
    'user:id': author.id,
    'user:name': author.username,
    'user:global-name': author.globalName || author.username,
    'user:created': author.createdAt ? `<t:${Math.floor(new Date(author.createdAt).getTime() / 1000)}:F>` : '',
    'member:nickname': member?.displayName || author.username,
    'member:joined': member?.joinedAt ? `<t:${Math.floor(new Date(member.joinedAt).getTime() / 1000)}:F>` : '',
    'member:roles': member?.roles?.cache?.map(r => `<@&${r.id}>`).join(', ') || '',
    'server:name': guild.name,
    'honeypot:channel:mention': `<#${message.channel.id}>`,
    'honeypot:channel:link': honeypotLink,
    'honeypot:moderation-count': String((config.moderationCount || 0) + 1),
    'action:text': actionText(action),
    'reinvite:link': '',
  };

  if (config.reinvite) {
    const invite = await message.channel.createInvite({ maxAge: 7 * 24 * 60 * 60, maxUses: 0 }).catch(() => null);
    if (invite) vars['reinvite:link'] = invite.url;
  }

  // 1. DM (unless disabled). Best effort - closed DMs are not an error.
  if (!config.noDM) {
    const dmTemplate = config.dmMessage || null;
    const dmContent = dmTemplate
      ? resolveTemplate(dmTemplate, vars)
      : buildDefaultDM({
          userMention: vars['user:mention'],
          serverName: guild.name,
          action,
          honeypotLink,
        });
    try {
      await author.send(dmContent).catch(() => null);
    } catch {
      // ignore - user may have DMs closed
    }
  }

  // Helper: increment counter atomically after handling.
  async function incrementCount() {
    try {
      await HoneypotConfig.updateOne(
        { guildId: guild.id },
        { $inc: { moderationCount: 1 } }
      );
      invalidateCache(guild.id);
    } catch {}
  }

  // 2. Warning message in honeypot channel (unless disabled). Pin it so trap stays visible.
  if (!config.noWarning) {
    const warnTemplate = config.warningMessage || null;
    const warnContent = warnTemplate ? resolveTemplate(warnTemplate, vars) : buildDefaultWarning(action);
    try {
      const warnMsg = await message.channel.send(warnContent).catch(() => null);
      if (warnMsg) await warnMsg.pin().catch(() => null);
    } catch {}
  }

  // 3. Enforce action.
  let enforced = false;
  let failureReason = null;

  try {
    if (action === 'ban' || action === 'softban') {
      if (!guild.members.me?.permissions?.has(PermissionFlagsBits.BanMembers)) {
        failureReason = 'Bot is missing Ban Members permission.';
      } else if (member && !guild.members.me.roles.highest.comparePositionTo(member.roles.highest)) {
        // Bot role must be above the target. discord.js: highest > target highest.
        // If compare <= 0 means bot is not above.
        const cmp = guild.members.me.roles.highest.comparePositionTo(member.roles.highest);
        if (cmp <= 0) failureReason = 'Bot role is not above the user.';
      }
    }

    if (!failureReason) {
      if (action === 'ban') {
        await guild.members.ban(author.id, { deleteMessageSeconds: 3600, reason: 'Honeypot triggered' });
        enforced = true;
      } else if (action === 'softban') {
        await guild.members.ban(author.id, { deleteMessageSeconds: 3600, reason: 'Honeypot triggered (softban)' });
        // Unban shortly after so messages are wiped but user can rejoin.
        try {
          await guild.members.unban(author.id, 'Honeypot softban complete');
        } catch (unbanErr) {
          // If unban fails, log it but keep enforced=true.
          console.error('Honeypot softban unban failed:', unbanErr);
        }
        enforced = true;
      } else if (action === 'kick') {
        await message.delete().catch(() => null);
        await member?.kick('Honeypot triggered').catch(() => null);
        enforced = !!member;
      } else {
        // disabled: just delete the message.
        await message.delete().catch(() => null);
        enforced = true;
      }
    }
  } catch (err) {
    failureReason = err.message || 'Unknown error';
    // Fallback: at least delete triggering message.
    await message.delete().catch(() => null);
  }

  // 4. Log.
  const logTemplate = config.logMessage || null;
  const logContent = logTemplate ? resolveTemplate(logTemplate, vars) : buildDefaultLog({
    userMention: `<@${author.id}>`,
    userId: author.id,
    action,
    channelMention: `<#${message.channel.id}>`,
    created: vars['user:created'],
    joined: vars['member:joined'],
  });
  await writeLog(logContent, { isFailure: !!failureReason });

  await incrementCount();
  return true;
}

module.exports = {
  getHoneypotConfig,
  getOrCreateHoneypotConfig,
  updateHoneypotConfig,
  invalidateCache,
  handleHoneypotTrigger,
  resolveTemplate,
  actionText,
  buildDefaultWarning,
  buildDefaultDM,
  buildDefaultLog,
};
