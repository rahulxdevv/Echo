const Ticket = require('../models/Ticket');
const TicketConfig = require('../models/TicketConfig');
const {
  PermissionFlagsBits,
  ChannelType,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

async function getTicketConfig(guildId) {
  let config = await TicketConfig.findOne({ guildId });

  if (!config) {
    config = await TicketConfig.create({ guildId });
  }

  return config;
}

async function updateTicketConfig(guildId, updates) {
  const config = await TicketConfig.findOneAndUpdate(
    { guildId },
    { ...updates, updatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  return config;
}

async function createTicket(guild, user, category = 'general') {
  const config = await getTicketConfig(guild.id);

  // Check max tickets per user
  const userTickets = await Ticket.countDocuments({
    guildId: guild.id,
    userId: user.id,
    status: 'open'
  });

  if (userTickets >= config.maxTicketsPerUser) {
    return { error: `You already have ${config.maxTicketsPerUser} open ticket(s). Please close one before opening another.` };
  }

  // Increment ticket counter
  config.ticketCounter += 1;
  await config.save();

  const ticketNumber = config.ticketCounter;
  const channelName = config.ticketNameFormat
    .replace('{number}', ticketNumber.toString().padStart(4, '0'))
    .replace('{user}', user.username)
    .replace('{category}', category);

  // Find category info
  const categoryInfo = config.categories.find(c => c.id === category) || { name: 'General', staffRoles: [] };

  // Create channel
  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `Ticket #${ticketNumber} | User: ${user.tag} | Category: ${categoryInfo.name}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        ...config.staffRoles.map(roleId => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages
          ]
        })),
        ...categoryInfo.staffRoles.map(roleId => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages
          ]
        }))
      ]
    });

    // Create ticket in database
    const ticket = await Ticket.create({
      guildId: guild.id,
      ticketNumber,
      channelId: channel.id,
      userId: user.id,
      userName: user.tag,
      category,
      status: 'open'
    });

    return { ticket, channel, config };
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    return { error: 'Failed to create ticket channel. Please check bot permissions.' };
  }
}

async function closeTicket(ticket, closedBy, reason = 'No reason provided') {
  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closeReason = reason;
  await ticket.save();

  return ticket;
}

async function addToTranscript(ticket, author, authorId, content, attachments = []) {
  ticket.transcript.push({
    author,
    authorId,
    content,
    timestamp: new Date(),
    attachments
  });

  await ticket.save();
}

async function fetchTicketChannelMessages(ticket, guild) {
  if (!guild || !ticket.channelId) return [];

  try {
    const channel = await guild.channels.fetch(ticket.channelId);
    if (!channel?.messages?.fetch) return [];

    const messages = [];
    let before;

    while (messages.length < 1000) {
      const batch = await channel.messages.fetch({
        limit: Math.min(100, 1000 - messages.length),
        ...(before ? { before } : {})
      });

      if (!batch.size) break;

      messages.push(...batch.values());
      before = batch.last().id;
      if (batch.size < 100) break;
    }

    return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  } catch (error) {
    console.error('Failed to fetch ticket channel messages for transcript:', error);
    return [];
  }
}

function formatTranscriptEntry(entry) {
  const timestamp = entry.timestamp instanceof Date
    ? entry.timestamp.toISOString()
    : new Date(entry.timestamp || Date.now()).toISOString();

  const lines = [
    `[${timestamp}] ${entry.author} (${entry.authorId}):`,
    entry.content || '(no content)'
  ];

  if (entry.attachments?.length > 0) {
    lines.push('Attachments:');
    entry.attachments.forEach(url => lines.push(`  - ${url}`));
  }

  lines.push('');
  return lines;
}

async function generateTranscript(ticket, guild) {
  try {
    const channel = await guild.channels.fetch(ticket.channelId);

    if (channel?.isTextBased?.() && channel?.messages?.fetch) {
      return createTranscript(channel, {
        limit: -1,
        filename: `ticket-${ticket.ticketNumber}.html`,
        poweredBy: false,
        footerText: 'Exported {number} message{s}.'
      });
    }
  } catch (error) {
    console.error('Failed to create HTML ticket transcript:', error);
  }

  const liveMessages = await fetchTicketChannelMessages(ticket, guild);
  const transcriptEntries = liveMessages.length > 0
    ? liveMessages.map(message => ({
        author: message.author?.tag || message.author?.username || 'Unknown User',
        authorId: message.author?.id || 'unknown',
        content: message.content,
        timestamp: message.createdAt,
        attachments: message.attachments.map(attachment => attachment.url)
      }))
    : ticket.transcript;

  const lines = [
    `Ticket #${ticket.ticketNumber}`,
    `User: ${ticket.userName} (${ticket.userId})`,
    `Category: ${ticket.category}`,
    `Status: ${ticket.status}`,
    `Created: ${ticket.createdAt.toISOString()}`,
    ticket.closedAt ? `Closed: ${ticket.closedAt.toISOString()}` : '',
    ticket.closeReason ? `Close Reason: ${ticket.closeReason}` : '',
    ticket.claimedBy ? `Claimed By: ${ticket.claimedByName} (${ticket.claimedBy})` : '',
    '',
    '--- Transcript ---',
    liveMessages.length > 0 ? 'Source: live channel history' : 'Source: saved ticket messages',
    ''
  ].filter(Boolean);

  if (transcriptEntries.length === 0) {
    lines.push('(No messages were found in this ticket.)');
  } else {
    for (const entry of transcriptEntries) {
      lines.push(...formatTranscriptEntry(entry));
    }
  }

  return {
    attachment: Buffer.from(lines.join('\n'), 'utf-8'),
    name: `ticket-${ticket.ticketNumber}.txt`
  };
}

async function sendTicketLog(guild, config, title, details, files = []) {
  if (!config?.logChannelId) return null;

  try {
    const logChannel = await guild.channels.fetch(config.logChannelId);
    if (!logChannel?.send) return null;

    if (files.length > 0) {
      return await logChannel.send({
        content: `**${title}**\n\n${details}`,
        files
      });
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${title}**\n\n${details}`)
      );

    return await logChannel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  } catch (error) {
    console.error('Failed to send ticket log:', error);
    return null;
  }
}

async function claimTicket(ticket, user) {
  ticket.claimedBy = user.id;
  ticket.claimedByName = user.tag;
  await ticket.save();

  return ticket;
}

async function unclaimTicket(ticket) {
  ticket.claimedBy = null;
  ticket.claimedByName = null;
  await ticket.save();

  return ticket;
}

async function setPriority(ticket, priority) {
  ticket.priority = priority;
  await ticket.save();

  return ticket;
}

async function getUserTickets(guildId, userId, status = 'open') {
  return await Ticket.find({ guildId, userId, status }).sort({ createdAt: -1 });
}

async function getAllTickets(guildId, status = null) {
  const query = { guildId };
  if (status) {
    query.status = status;
  }

  return await Ticket.find(query).sort({ createdAt: -1 });
}

async function getTicketByChannel(channelId) {
  return await Ticket.findOne({ channelId, status: 'open' });
}

async function getTicketByNumber(guildId, ticketNumber) {
  return await Ticket.findOne({ guildId, ticketNumber });
}

module.exports = {
  getTicketConfig,
  updateTicketConfig,
  createTicket,
  closeTicket,
  addToTranscript,
  generateTranscript,
  sendTicketLog,
  claimTicket,
  unclaimTicket,
  setPriority,
  getUserTickets,
  getAllTickets,
  getTicketByChannel,
  getTicketByNumber
};
