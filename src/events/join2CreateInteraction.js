const { PermissionFlagsBits } = require('discord.js');
const {
  buildComponentsV2Message,
  buildLimitModal,
  buildRenameModal,
  getActiveChannel,
  refreshControlPanel,
  removeActiveChannel,
  resolveControlContext
} = require('../utils/join2create');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('j2c:')) {
        return handleButton(interaction);
      }

      if (interaction.isUserSelectMenu() && interaction.customId.startsWith('j2c-user:')) {
        return handleUserSelect(interaction);
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('j2c-modal:')) {
        return handleModal(interaction);
      }
    } catch (error) {
      console.error('Join2Create interaction error:', error);

      const payload = buildComponentsV2Message(
        'Something went wrong while updating this voice channel.',
        { ephemeral: true }
      );

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(payload).catch(() => null);
      }

      return interaction.reply(payload).catch(() => null);
    }
  }
};

async function handleButton(interaction) {
  const [, action, channelId] = interaction.customId.split(':');

  if (action === 'rename') {
    const context = await resolveControlContext(interaction, channelId);
    if (context.error) return replyStatus(interaction, context.error);
    return interaction.showModal(buildRenameModal(channelId));
  }

  if (action === 'limit') {
    const context = await resolveControlContext(interaction, channelId);
    if (context.error) return replyStatus(interaction, context.error);
    return interaction.showModal(buildLimitModal(channelId));
  }

  if (action === 'claim') {
    return handleClaim(interaction, channelId);
  }

  const context = await resolveControlContext(interaction, channelId);
  if (context.error) return replyStatus(interaction, context.error);

  const { channel } = context;

  if (action === 'lock') {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: false });
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, 'Voice channel locked.');
  }

  if (action === 'unlock') {
    await channel.permissionOverwrites.edit(channel.guild.id, { Connect: null });
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, 'Voice channel unlocked.');
  }

  if (action === 'hide') {
    await channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: false });
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, 'Voice channel hidden.');
  }

  if (action === 'show') {
    await channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: null });
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, 'Voice channel visible again.');
  }

  if (action === 'delete') {
    await replyStatus(interaction, 'Deleting this temporary voice channel.');
    await removeActiveChannel(interaction.guild.id, channel.id);
    return channel.delete('Join2Create owner deleted channel').catch(() => null);
  }

  return replyStatus(interaction, 'Unknown voice control.');
}

async function handleClaim(interaction, channelId) {
  const { config, active } = await getActiveChannel(interaction.guild.id, channelId);
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!active || !channel) {
    return replyStatus(interaction, 'This temporary voice channel no longer exists.');
  }

  if (interaction.member.voice.channelId !== channel.id) {
    return replyStatus(interaction, 'Join this temporary VC before claiming it.');
  }

  const ownerStillInside = channel.members.has(active.ownerId);
  const canForceClaim = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (ownerStillInside && !canForceClaim) {
    return replyStatus(interaction, 'The current owner is still in the VC.');
  }

  active.ownerId = interaction.user.id;
  await config.save();

  await channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    Stream: true,
    UseVAD: true,
    ManageChannels: true,
    MoveMembers: true
  });

  await refreshControlPanel(interaction.guild, channel.id);
  return replyStatus(interaction, 'You now own this temporary voice channel.');
}

async function handleUserSelect(interaction) {
  const [, action, channelId] = interaction.customId.split(':');
  const context = await resolveControlContext(interaction, channelId);
  if (context.error) return replyStatus(interaction, context.error);

  const { channel } = context;
  const targetId = interaction.values[0];
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);

  if (!target) {
    return replyStatus(interaction, 'I could not find that member.');
  }

  if (target.id === interaction.user.id && action === 'kick') {
    return replyStatus(interaction, 'You cannot kick yourself from your own control panel.');
  }

  if (target.voice.channelId !== channel.id) {
    return replyStatus(interaction, 'That member is not in this temporary VC.');
  }

  if (action === 'kick') {
    await target.voice.disconnect('Kicked from Join2Create voice channel');
    return replyStatus(interaction, `Kicked ${target.user.tag} from the VC.`);
  }

  if (action === 'transfer') {
    context.active.ownerId = target.id;
    await context.config.save();

    await channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
      Stream: true,
      UseVAD: true,
      ManageChannels: true,
      MoveMembers: true
    });

    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, `Transferred this VC to ${target.user.tag}.`);
  }

  return replyStatus(interaction, 'Unknown user action.');
}

async function handleModal(interaction) {
  const [, action, channelId] = interaction.customId.split(':');
  const context = await resolveControlContext(interaction, channelId);
  if (context.error) return replyStatus(interaction, context.error);

  const { channel } = context;

  if (action === 'rename') {
    const name = interaction.fields.getTextInputValue('name').trim().slice(0, 100);
    await channel.setName(name, 'Join2Create rename');
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, `Voice channel renamed to **${name}**.`);
  }

  if (action === 'limit') {
    const rawLimit = interaction.fields.getTextInputValue('limit').trim();
    const limit = Number(rawLimit);

    if (!Number.isInteger(limit) || limit < 0 || limit > 99) {
      return replyStatus(interaction, 'User limit must be a whole number from 0 to 99.');
    }

    await channel.setUserLimit(limit, 'Join2Create limit update');
    await refreshControlPanel(interaction.guild, channel.id);
    return replyStatus(interaction, `Voice channel user limit set to ${limit || 'unlimited'}.`);
  }

  return replyStatus(interaction, 'Unknown modal action.');
}

function replyStatus(interaction, message) {
  return interaction.reply(buildComponentsV2Message(message, { ephemeral: true }));
}
