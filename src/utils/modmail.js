const ModmailConfig = require('../models/ModmailConfig');
const ModmailThread = require('../models/ModmailThread');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');

async function handleIncomingDM(message, client) {
  // Find all guilds the user and bot share
  const mutualGuilds = [];
  for (const [id, guild] of client.guilds.cache) {
    if (guild.members.cache.has(message.author.id)) {
      mutualGuilds.push(guild);
    }
  }

  if (mutualGuilds.length === 0) return;

  // Let's check if they already have an active thread
  let activeThread = await ModmailThread.findOne({ userId: message.author.id, active: true });
  
  if (!activeThread) {
    // If they don't, we will try to open one in the FIRST mutual guild that has modmail enabled
    // Note: for a more advanced version, you'd send them a menu to pick the server.
    for (const guild of mutualGuilds) {
      const config = await ModmailConfig.findOne({ guildId: guild.id, enabled: true });
      if (config) {
        // Start thread here
        const category = guild.channels.cache.get(config.categoryId);
        if (category) {
          const modmailChannel = await guild.channels.create({
            name: `ticket-${message.author.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: config.roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              },
              {
                id: client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
              }
            ]
          });

          activeThread = new ModmailThread({
            userId: message.author.id,
            guildId: guild.id,
            channelId: modmailChannel.id
          });
          await activeThread.save();

          // Send intro message to staff
          const introContainer = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# New ModMail Ticket\n\n**User:** ${message.author.tag} (<@${message.author.id}>)\n**Account Created:** <t:${Math.floor(message.author.createdTimestamp / 1000)}:R>\n\nStaff with <@&${config.roleId}> can reply here. Prefix your message with \`!\` to chat internally without sending to the user.`)
          );
          
          await modmailChannel.send({ flags: MessageFlags.IsComponentsV2, components: [introContainer] });
          await message.author.send('✅ **Your message has been securely forwarded to our staff.**');
          break;
        }
      }
    }
  }

  if (activeThread) {
    // Forward the message to the active thread channel
    const guild = client.guilds.cache.get(activeThread.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(activeThread.channelId);
    if (!channel) {
      // Channel was deleted manually
      activeThread.active = false;
      await activeThread.save();
      return message.author.send('❌ **Your modmail ticket was closed. Please send a new message to open a new one.**');
    }

    const attachments = message.attachments.map(a => a.url).join('\n');
    let content = message.content || '';
    if (attachments) content += `\n\n**Attachments:**\n${attachments}`;

    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**[USER] ${message.author.username}**: ${content}`)
    );

    await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
  } else {
    await message.author.send('❌ **None of the servers we share have ModMail enabled.**').catch(() => {});
  }
}

async function handleStaffReply(message, client) {
  // Check if it's a modmail thread
  const activeThread = await ModmailThread.findOne({ channelId: message.channel.id, active: true });
  if (!activeThread) return;

  // Internal chat ignore
  if (message.content.startsWith('!')) return;

  const user = await client.users.fetch(activeThread.userId).catch(() => null);
  if (!user) {
    return message.channel.send('❌ **Error:** Could not find the user. They might have left the server or deleted their account.');
  }

  const attachments = message.attachments.map(a => a.url).join('\n');
  let content = message.content || '';
  if (attachments) content += `\n\n**Attachments:**\n${attachments}`;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**[STAFF] ${message.author.username}**: ${content}`)
    );

  try {
    await user.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    await message.react('✅');
  } catch (error) {
    await message.channel.send('❌ **Error:** Could not DM the user. Their DMs might be closed.');
  }
}

async function closeModmail(channelId, userClosing, guild) {
  const thread = await ModmailThread.findOne({ channelId, active: true });
  if (!thread) return false;

  thread.active = false;
  await thread.save();

  const config = await ModmailConfig.findOne({ guildId: guild.id });
  if (config && config.logChannelId) {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🔒 **ModMail Ticket Closed**\n\n**User ID:** ${thread.userId}\n**Closed By:** ${userClosing.tag}`)
      );
      await logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
  }

  return thread.userId;
}

module.exports = {
  handleIncomingDM,
  handleStaffReply,
  closeModmail
};
