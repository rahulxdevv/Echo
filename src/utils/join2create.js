const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require('discord.js');
const Join2CreateConfig = require('../models/Join2CreateConfig');

async function getJoin2CreateConfig(guildId) {
  let config = await Join2CreateConfig.findOne({ guildId });

  if (!config) {
    config = await Join2CreateConfig.create({ guildId });
  }

  return config;
}

async function updateJoin2CreateConfig(guildId, updates) {
  return Join2CreateConfig.findOneAndUpdate(
    { guildId },
    { ...updates, updatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );
}

function formatChannelName(format, member) {
  return (format || "{user}'s VC")
    .replaceAll('{user}', member.user.username)
    .replaceAll('{display}', member.displayName)
    .slice(0, 100);
}

function buildControlPanel(channel, ownerId) {
  const locked = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionFlagsBits.Connect);
  const hidden = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionFlagsBits.ViewChannel);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`j2c:lock:${channel.id}`)
        .setLabel(locked ? 'Locked' : 'Lock')
        .setStyle(locked ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`j2c:unlock:${channel.id}`)
        .setLabel('Unlock')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`j2c:hide:${channel.id}`)
        .setLabel(hidden ? 'Hidden' : 'Hide')
        .setStyle(hidden ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`j2c:show:${channel.id}`)
        .setLabel('Show')
        .setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`j2c:rename:${channel.id}`)
        .setLabel('Name')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`j2c:limit:${channel.id}`)
        .setLabel('Limit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`j2c:claim:${channel.id}`)
        .setLabel('Claim')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`j2c:delete:${channel.id}`)
        .setLabel('Delete')
        .setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`j2c-user:kick:${channel.id}`)
        .setPlaceholder('Kick a user from this VC')
        .setMinValues(1)
        .setMaxValues(1)
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`j2c-user:transfer:${channel.id}`)
        .setPlaceholder('Transfer this VC to a user')
        .setMinValues(1)
        .setMaxValues(1)
    )
  ];
}

function buildPanelContent(channel, ownerId) {
  return [
    `# Voice Controls`,
    '',
    `Owner: <@${ownerId}>`,
    `Channel: ${channel}`,
    `Limit: ${channel.userLimit || 'No limit'}`,
    '',
    'Use the buttons and menus below to manage this temporary voice channel.'
  ].join('\n');
}

function buildTextContainer(content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function buildControlContainer(channel, ownerId) {
  const container = buildTextContainer(buildPanelContent(channel, ownerId))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small)
    );

  for (const row of buildControlPanel(channel, ownerId)) {
    container.addActionRowComponents(actionRow => actionRow.setComponents(...row.components));
  }

  return container;
}

function buildComponentsV2Message(content, extra = {}) {
  return {
    flags: MessageFlags.IsComponentsV2 | (extra.ephemeral ? MessageFlags.Ephemeral : 0),
    components: [buildTextContainer(content)]
  };
}

async function sendControlPanel(channel, ownerId) {
  if (typeof channel.send !== 'function') return null;

  try {
    return await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [buildControlContainer(channel, ownerId)]
    });
  } catch (error) {
    console.error('Failed to send join2create control panel:', error);
    return null;
  }
}

async function refreshControlPanel(guild, channelId) {
  const config = await getJoin2CreateConfig(guild.id);
  const active = config.activeChannels.find(vc => vc.channelId === channelId);
  if (!active?.controlMessageId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.messages?.fetch) return;

  const message = await channel.messages.fetch(active.controlMessageId).catch(() => null);
  if (!message) return;

  await message.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [buildControlContainer(channel, active.ownerId)]
  }).catch(() => null);
}

async function createTemporaryVoice(member, config) {
  const parent = config.categoryId || member.voice.channel?.parentId || null;
  const parentChannel = parent ? await member.guild.channels.fetch(parent).catch(() => null) : null;
  const parentOverwrites = parentChannel?.permissionOverwrites?.cache
    ? parentChannel.permissionOverwrites.cache.map(overwrite => ({
        id: overwrite.id,
        allow: overwrite.allow.bitfield,
        deny: overwrite.deny.bitfield,
        type: overwrite.type
      }))
    : [];

  const channel = await member.guild.channels.create({
    name: formatChannelName(config.channelNameFormat, member),
    type: ChannelType.GuildVoice,
    parent,
    userLimit: config.defaultUserLimit || 0,
    permissionOverwrites: [
      ...parentOverwrites,
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers
        ]
      }
    ]
  });

  await member.voice.setChannel(channel, 'Join2Create temporary voice channel');
  const panelMessage = await sendControlPanel(channel, member.id);

  config.activeChannels.push({
    channelId: channel.id,
    ownerId: member.id,
    controlMessageId: panelMessage?.id || null
  });
  await config.save();

  return channel;
}

async function removeActiveChannel(guildId, channelId) {
  await Join2CreateConfig.updateOne(
    { guildId },
    {
      $pull: { activeChannels: { channelId } },
      $set: { updatedAt: new Date() }
    }
  );
}

async function cleanupTemporaryVoice(channel) {
  if (!channel) return;

  const config = await getJoin2CreateConfig(channel.guild.id);
  const active = config.activeChannels.find(vc => vc.channelId === channel.id);
  if (!active) return;

  const humanMembers = channel.members.filter(member => !member.user.bot);
  if (humanMembers.size > 0) return;

  await removeActiveChannel(channel.guild.id, channel.id);
  await channel.delete('Join2Create channel empty').catch(error => {
    console.error('Failed to delete empty join2create channel:', error);
  });
}

async function getActiveChannel(guildId, channelId) {
  const config = await getJoin2CreateConfig(guildId);
  const active = config.activeChannels.find(vc => vc.channelId === channelId);
  return { config, active };
}

function canControl(member, active, channel) {
  if (!member || !active || !channel) return false;
  if (member.id === active.ownerId) return true;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  return false;
}

async function resolveControlContext(interaction, channelId) {
  const { config, active } = await getActiveChannel(interaction.guild.id, channelId);
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!active || !channel) {
    return { error: 'This temporary voice channel no longer exists.' };
  }

  if (!canControl(interaction.member, active, channel)) {
    return { error: 'Only the VC owner or server managers can use these controls.' };
  }

  return { config, active, channel };
}

function buildRenameModal(channelId) {
  return new ModalBuilder()
    .setCustomId(`j2c-modal:rename:${channelId}`)
    .setTitle('Rename Voice Channel')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('New channel name')
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(100)
          .setRequired(true)
      )
    );
}

function buildLimitModal(channelId) {
  return new ModalBuilder()
    .setCustomId(`j2c-modal:limit:${channelId}`)
    .setTitle('Set User Limit')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('limit')
          .setLabel('User limit (0 for unlimited)')
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(2)
          .setRequired(true)
      )
    );
}

module.exports = {
  buildLimitModal,
  buildRenameModal,
  buildComponentsV2Message,
  cleanupTemporaryVoice,
  createTemporaryVoice,
  getActiveChannel,
  getJoin2CreateConfig,
  refreshControlPanel,
  removeActiveChannel,
  resolveControlContext,
  updateJoin2CreateConfig
};
