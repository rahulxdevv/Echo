const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');
const TempRole = require('../../models/TempRole');

module.exports = {
  category: 'Moderation',
  name: 'role',
  description: 'Manage member roles',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage member roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('The user to add role to').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for adding role')))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption(opt => opt.setName('user').setDescription('The user to remove role from').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to remove').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for removing role')))
    .addSubcommand(sub =>
      sub.setName('temp')
        .setDescription('Add a temporary role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('The user to add role to').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to add').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 1d, 30m)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for adding role'))),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply(createErrorPayload('You need Manage Roles permission to use this command.'));
    }

    const sub = args[0]?.toLowerCase();
    if (!['add', 'remove', 'temp'].includes(sub)) {
      return message.reply(createErrorPayload('Usage: `!role <add|remove|temp> <user> <role> [duration/reason]`'));
    }

    const member = message.mentions.members.first();
    const role = message.mentions.roles.first();

    if (!member || !role) {
      return message.reply(createErrorPayload('Please mention a user and a role.'));
    }

    if (sub === 'add') {
      const reason = args.slice(3).join(' ') || 'No reason provided';
      await handleAdd(message, member, role, reason, message.author);
    } else if (sub === 'remove') {
      const reason = args.slice(3).join(' ') || 'No reason provided';
      await handleRemove(message, member, role, reason, message.author);
    } else if (sub === 'temp') {
      const durationStr = args[3];
      const reason = args.slice(4).join(' ') || 'No reason provided';
      if (!durationStr) return message.reply(createErrorPayload('Please provide a duration (e.g. 1h, 1d).'));
      await handleTemp(message, member, role, durationStr, reason, message.author);
    }
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (sub === 'add') {
      await handleAdd(interaction, member, role, reason, interaction.user);
    } else if (sub === 'remove') {
      await handleRemove(interaction, member, role, reason, interaction.user);
    } else if (sub === 'temp') {
      const durationStr = interaction.options.getString('duration');
      await handleTemp(interaction, member, role, durationStr, reason, interaction.user);
    }
  }
};

async function handleAdd(context, member, role, reason, moderator) {
  if (role.position >= context.guild.members.me.roles.highest.position) {
    return context.reply(createErrorPayload('I cannot manage this role due to role hierarchy.'));
  }
  if (role.position >= context.member.roles.highest.position) {
    return context.reply(createErrorPayload('You cannot manage this role due to role hierarchy.'));
  }
  if (member.roles.cache.has(role.id)) {
    return context.reply(createErrorPayload('User already has this role.'));
  }

  try {
    await member.roles.add(role, reason);
    await context.reply(createRolePayload('Role Added', emojis.common.plus, member.user, role, moderator, reason));
  } catch (err) {
    await context.reply(createErrorPayload(`Failed to add role: ${err.message}`));
  }
}

async function handleRemove(context, member, role, reason, moderator) {
  if (role.position >= context.guild.members.me.roles.highest.position) {
    return context.reply(createErrorPayload('I cannot manage this role due to role hierarchy.'));
  }
  if (role.position >= context.member.roles.highest.position) {
    return context.reply(createErrorPayload('You cannot manage this role due to role hierarchy.'));
  }
  if (!member.roles.cache.has(role.id)) {
    return context.reply(createErrorPayload('User does not have this role.'));
  }

  try {
    await member.roles.remove(role, reason);
    await context.reply(createRolePayload('Role Removed', emojis.common.minus, member.user, role, moderator, reason));
  } catch (err) {
    await context.reply(createErrorPayload(`Failed to remove role: ${err.message}`));
  }
}

async function handleTemp(context, member, role, durationStr, reason, moderator) {
  if (role.position >= context.guild.members.me.roles.highest.position) {
    return context.reply(createErrorPayload('I cannot manage this role due to role hierarchy.'));
  }
  if (role.position >= context.member.roles.highest.position) {
    return context.reply(createErrorPayload('You cannot manage this role due to role hierarchy.'));
  }

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    return context.reply(createErrorPayload('Invalid duration format. Use 10m, 1h, 1d, etc.'));
  }

  try {
    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, reason);
    }

    const expiresAt = new Date(Date.now() + durationMs);
    await TempRole.create({
      guildId: context.guild.id,
      userId: member.id,
      roleId: role.id,
      expiresAt
    });

    await context.reply(createRolePayload('Temporary Role Added', emojis.common.clock, member.user, role, moderator, reason, durationStr));
  } catch (err) {
    await context.reply(createErrorPayload(`Failed to add temporary role: ${err.message}`));
  }
}

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * ms[unit];
}

function createRolePayload(title, emoji, user, role, moderator, reason, duration = null) {
  let text = `# ${emoji} ${title}\n\n`;
  text += `**User:** ${user.tag}\n`;
  text += `**Role:** ${role.name}\n`;
  text += `**Moderator:** ${moderator.tag}\n`;
  if (duration) text += `**Duration:** ${duration}\n`;
  text += `**Reason:** ${reason}`;

  const textDisplay = new TextDisplayBuilder().setContent(text);
  const separator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const container = new ContainerBuilder().addTextDisplayComponents(textDisplay).addSeparatorComponents(separator);

  return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

function createErrorPayload(message) {
  const textDisplay = new TextDisplayBuilder().setContent(`${emojis.status.warning} ${message}`);
  const container = new ContainerBuilder().addTextDisplayComponents(textDisplay);
  return { flags: MessageFlags.IsComponentsV2, components: [container] };
}
