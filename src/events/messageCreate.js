const { replyError } = require('../utils/respond');
const { incrementMessageCount, isChannelBlacklisted } = require('../utils/messages');
const { getTicketByChannel, addToTranscript } = require('../utils/tickets');
const { getStickyMessage, updateLastMessageId } = require('../utils/sticky');
const { handleIncomingDM, handleStaffReply } = require('../utils/modmail');
const afkCommand = require('../commands/utility/afk');
const {
  getAutoModConfig,
  containsInvite,
  containsLink,
  extractLinks,
  extractDomain,
  containsBadWords,
  calculateCapsPercentage,
  isIgnored
} = require('../utils/automod');
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const emojis = require('../utils/emojis');
const AIConfig = require('../models/AIConfig');
const PremiumUser = require('../models/PremiumUser');
const axios = require('axios');

// Spam tracking
const spamTracking = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    
    if (!message.guild) {
      // It's a DM, route to modmail
      return handleIncomingDM(message, client);
    }

    // ── AFK: Check if the author is returning from AFK ──────────────────────
    const afkEntry = afkCommand.isAfk(message.author.id, message.guild.id);
    if (afkEntry) {
      const msgLower = message.content.toLowerCase().trim();
      const cfgPrefix = (client.config || require('../config')).prefix;
      const isAfkCommand = msgLower.startsWith(`${cfgPrefix}afk`) || msgLower.startsWith('/afk');
      if (!isAfkCommand) {
        afkCommand.afkStore.delete(message.author.id);
        const duration = afkCommand.formatDuration(Date.now() - afkEntry.timestamp);
        try {
          await message.reply(afkCommand.buildReturnPayload(message.author.username, duration));
        } catch (e) { /* ignore */ }
      }
    }

    // ── AFK: Notify if any mentioned user is AFK ─────────────────────────────
    if (message.mentions.users.size > 0) {
      for (const [userId, user] of message.mentions.users) {
        if (userId === message.author.id) continue;
        const mentionedAfk = afkCommand.isAfk(userId, message.guild.id);
        if (mentionedAfk) {
          const duration = afkCommand.formatDuration(Date.now() - mentionedAfk.timestamp);
          try {
            await message.reply(afkCommand.buildPingNotifyPayload(user.username, mentionedAfk.reason, duration));
          } catch (e) { /* ignore */ }
        }
      }
    }

    // It's in a guild, let's check if it's a staff reply in a modmail thread
    // Only non-commands should be handled as replies
    const config = client.config || require('../config');
    const prefix = config.prefix;
    if (!message.content.startsWith(prefix)) {
      await handleStaffReply(message, client);
    }

    // Track ticket messages for transcript
    (async () => {
      try {
        const ticket = await getTicketByChannel(message.channel.id);
        if (ticket) {
          const attachments = message.attachments.map(att => att.url);
          await addToTranscript(
            ticket,
            message.author.tag,
            message.author.id,
            message.content,
            attachments
          );
        }
      } catch (error) {
        console.error('Ticket message tracking error:', error);
      }
    })();

    // Run automod checks first
    try {
      const automodResult = await checkAutomod(message, client);
      if (automodResult.violated) return; // Stop processing if automod violation
    } catch (error) {
      console.error('Automod check error:', error);
    }

    // Handle sticky messages (non-blocking)
    (async () => {
      try {
        const sticky = await getStickyMessage(message.channel.id);
        if (sticky && sticky.enabled) {
          // Delete the old sticky message
          if (sticky.lastMessageId) {
            try {
              const oldMessage = await message.channel.messages.fetch(sticky.lastMessageId);
              await oldMessage.delete();
            } catch (err) {
              // Message might already be deleted, ignore
            }
          }

          // Send the new sticky message
          const newStickyMessage = await message.channel.send(sticky.message);
          await updateLastMessageId(message.channel.id, newStickyMessage.id);
        }
      } catch (error) {
        console.error('Sticky message error:', error);
      }
    })();

    // Track message count (non-blocking)
    (async () => {
      try {
        const blacklisted = await isChannelBlacklisted(message.guild.id, message.channel.id);
        if (!blacklisted) {
          await incrementMessageCount(message.guild.id, message.author.id, message.author.tag);
        }
      } catch (error) {
        console.error('Error tracking message:', error);
      }
    })();

    // ── AI Channel: Auto-response for designated channels ──────────────────
    (async () => {
      try {
        const aiConfig = await AIConfig.findOne({ guildId: message.guild.id, channelId: message.channel.id, enabled: true });
        if (aiConfig) {
          // Check if guild owner has premium
          const isPremium = await PremiumUser.findOne({ userId: message.guild.ownerId });
          if (!isPremium) return;

          await message.channel.sendTyping();
          const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(message.content)}?model=openai&system=You are Echo AI, a helpful and friendly assistant integrated into the Echo Discord bot.`);
          
          if (response.data) {
            const container = new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(response.data.substring(0, 2000))
            );
            await message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
          }
        }
      } catch (error) {
        // Silently fail for auto-chat
      }
    })();
    
    // Ping response
    if (message.content === `<@!${client.user.id}>` || message.content === `<@${client.user.id}>`) {
      const textDisplay = new TextDisplayBuilder().setContent(
        `# 👋 Hello, I'm **Echo**!\n` +
        `I'm your all-in-one Discord utility bot, designed to make your server experience seamless and fun.\n\n` +
        `**Current Prefix:** \`${prefix}\`\n` +
        `**Quick Start:** Type \`${prefix}help\` or use \`/help\` to explore my capabilities.`
      );

      const separator = new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);

      const footer = new TextDisplayBuilder().setContent(
        `*Need assistance? Join our support community below.*`
      );

      const buttons = [
        new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL('https://echohq.in'),
        new ButtonBuilder().setLabel('Support').setStyle(ButtonStyle.Link).setURL('https://echohq.in/support'),
        new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
      ];

      const container = new ContainerBuilder()
        .addTextDisplayComponents(textDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(footer)
        .addActionRowComponents(row => row.addComponents(...buttons));

      return message.reply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [container]
      });
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command || command.slashOnly) return;

    try {
      await command.executePrefix(message, args, client);

      // Log command usage
      const logChannelId = process.env.COMMAND_LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
          const invite = message.guild ? await message.channel.createInvite({ maxAge: 0, maxUses: 0 }).catch(() => null) : null;
          const content = [
            `# ${emojis.categories.info} Command Used (Prefix)\n`,
            `**Command:** \`${prefix}${commandName}\``,
            `**User:** ${message.author.tag} (\`${message.author.id}\`)`,
            `**Server:** ${message.guild?.name || 'DM'} (\`${message.guildId || 'N/A'}\`)`,
            `**Invite:** ${invite ? invite.url : 'No Permission/DM'}`
          ].join('\n');
          const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
          await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [container] }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error executing prefix command:', error);
      await replyError(message, 'Something went wrong while running that command. Please try again in a moment.');
    }
  }
};

async function checkAutomod(message, client) {
  const config = await getAutoModConfig(message.guild.id);

  // Check if channel is ignored
  if (config.ignoredChannels.includes(message.channel.id)) {
    return { violated: false };
  }

  // Check if user is ignored
  if (isIgnored(message.member, config)) {
    return { violated: false };
  }

  // Anti-Spam Check
  if (config.antiSpam.enabled) {
    const spamResult = await checkSpam(message, config, client);
    if (spamResult.violated) return spamResult;
  }

  // Anti-Invite Check
  if (config.antiInvite.enabled && containsInvite(message.content)) {
    await handleViolation(message, config, 'invite', 'Discord invite detected');
    return { violated: true };
  }

  // Anti-Link Check
  if (config.antiLink.enabled && containsLink(message.content)) {
    const links = extractLinks(message.content);
    const allowed = config.antiLink.allowedDomains || [];

    const hasDisallowedLink = links.some(link => {
      const domain = extractDomain(link);
      return domain && !allowed.includes(domain);
    });

    if (hasDisallowedLink) {
      await handleViolation(message, config, 'link', 'Disallowed link detected');
      return { violated: true };
    }
  }

  // Bad Words Check
  if (config.badWords.enabled && config.badWords.words.length > 0) {
    if (containsBadWords(message.content, config.badWords.words)) {
      await handleViolation(message, config, 'badword', 'Bad word detected');
      return { violated: true };
    }
  }

  // Anti-Caps Check
  if (config.antiCaps.enabled && message.content.length >= config.antiCaps.minLength) {
    const capsPercentage = calculateCapsPercentage(message.content);
    if (capsPercentage >= config.antiCaps.percentage) {
      await handleViolation(message, config, 'caps', `Excessive caps (${Math.round(capsPercentage)}%)`);
      return { violated: true };
    }
  }

  return { violated: false };
}

async function checkSpam(message, config, client) {
  const userId = message.author.id;
  const guildId = message.guild.id;
  const key = `${guildId}-${userId}`;

  if (!spamTracking.has(key)) {
    spamTracking.set(key, []);
  }

  const userMessages = spamTracking.get(key);
  const now = Date.now();

  userMessages.push(now);

  const filtered = userMessages.filter(timestamp => now - timestamp < config.antiSpam.timeWindow);
  spamTracking.set(key, filtered);

  if (filtered.length >= config.antiSpam.maxMessages) {
    const recentMessages = await message.channel.messages.fetch({ limit: 100 });
    const userRecentMessages = recentMessages.filter(m =>
      m.author.id === userId &&
      now - m.createdTimestamp < config.antiSpam.timeWindow
    );

    try {
      await message.channel.bulkDelete(userRecentMessages);
    } catch (err) {
      console.error('Failed to bulk delete spam messages:', err);
    }

    try {
      await message.member.timeout(config.antiSpam.muteTime, 'Automod: Spam detected');
    } catch (err) {
      console.error('Failed to timeout user:', err);
    }

    await logViolation(message, config, 'spam', `Spam detected (${filtered.length} messages in ${config.antiSpam.timeWindow / 1000}s)`);

    spamTracking.delete(key);
    return { violated: true };
  }

  return { violated: false };
}

async function handleViolation(message, config, type, reason) {
  let action = 'delete';

  if (type === 'invite') action = config.antiInvite.action;
  else if (type === 'link') action = config.antiLink.action;
  else if (type === 'badword') action = config.badWords.action;

  try {
    await message.delete();
  } catch (err) {
    console.error('Failed to delete message:', err);
  }

  if (action === 'warn') {
    try {
      await message.channel.send(`${message.author}, warning: ${reason}`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    } catch (err) {
      console.error('Failed to send warning:', err);
    }
  } else if (action === 'mute') {
    try {
      await message.member.timeout(300000, `Automod: ${reason}`);
    } catch (err) {
      console.error('Failed to timeout user:', err);
    }
  }

  await logViolation(message, config, type, reason);
}

async function logViolation(message, config, type, reason) {
  if (!config.logChannel) return;

  try {
    const logChannel = await message.guild.channels.fetch(config.logChannel);
    if (!logChannel) return;

    const embed = {
      color: 0xff0000,
      title: 'Automod Action',
      fields: [
        { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Type', value: type, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Message Content', value: message.content.substring(0, 1000) || 'No content', inline: false }
      ],
      timestamp: new Date().toISOString()
    };

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to log violation:', error);
  }
}


