const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getInviteStats, getTopInviters, resetInvites } = require('../../utils/invites');
const Invite = require('../../models/Invite');
const { replyWithCard, replyError } = require('../../utils/respond');

module.exports = {
  category: 'Invites',
  name: 'invites',
  description: 'Manage and view server invites',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Manage and view server invites')
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check invite stats for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check (leave empty for yourself)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('Show top inviters in the server')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of top inviters to show (5-25)')
            .setMinValue(5)
            .setMaxValue(25)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List users invited by someone')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('page')
            .setDescription('Page number')
            .setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('inviter')
        .setDescription('Check who invited you or another user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('invited')
        .setDescription('See who you invited')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('invitecode')
        .setDescription('Get the invite code used by a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to check')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add invites to a user (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add invites to')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of invites to add')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of invites to add')
            .setRequired(true)
            .addChoices(
              { name: 'Total (Regular)', value: 'total' },
              { name: 'Fake', value: 'fake' })))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove invites from a user (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to remove invites from')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Number of invites to remove')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of invites to remove')
            .setRequired(true)
            .addChoices(
              { name: 'Total (Regular)', value: 'total' },
              { name: 'Fake', value: 'fake' })))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear invites (Admin only)')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to clear invites for (leave empty for all)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetmy')
        .setDescription('Reset your own invites')),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'check') {
      return this.handleCheck(message, args.slice(1), client, true);
    }

    switch (subcommand) {
      case 'leaderboard':
      case 'lb':
      case 'top':
        return this.handleLeaderboard(message, args.slice(1), client, true);

      case 'list':
      case 'invited':
        return this.handleList(message, args.slice(1), client, true);

      case 'invitedby':
      case 'inviter':
      case 'by':
        return this.handleInvitedBy(message, args.slice(1), client, true);

      case 'invitecode':
      case 'code':
        return this.handleInviteCode(message, args.slice(1), client, true);

      case 'add':
      case 'addinvites':
        return this.handleAdd(message, args.slice(1), client, true);

      case 'remove':
      case 'removeinvites':
        return this.handleRemove(message, args.slice(1), client, true);

      case 'clear':
      case 'clearinvites':
        return this.handleClear(message, args.slice(1), client, true);

      case 'resetmy':
      case 'resetmyinvites':
        return this.handleResetMy(message, args.slice(1), client, true);

      default:
        return this.handleCheck(message, args, client, true);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'check':
        return this.handleCheck(interaction, [], client, false);
      case 'leaderboard':
        return this.handleLeaderboard(interaction, [], client, false);
      case 'list':
        return this.handleList(interaction, [], client, false);
      case 'inviter':
        return this.handleInvitedBy(interaction, [], client, false);
      case 'invited':
        return this.handleList(interaction, [], client, false);
      case 'invitecode':
        return this.handleInviteCode(interaction, [], client, false);
      case 'add':
        return this.handleAdd(interaction, [], client, false);
      case 'remove':
        return this.handleRemove(interaction, [], client, false);
      case 'clear':
        return this.handleClear(interaction, [], client, false);
      case 'resetmy':
        return this.handleResetMy(interaction, [], client, false);
    }
  },

  async handleCheck(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first() || target.author
      : target.options.getUser('user') || target.user;

    try {
      const stats = await getInviteStats(isPrefix ? target.guild.id : target.guild.id, user.id);

      const embed = {
        color: 0x5865F2,
        title: `${user.username}'s Invites`,
        description: `Invite statistics for ${user.tag}`,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'Total Invites', value: `${stats.total}`, inline: true },
          { name: 'Regular', value: `${stats.regular}`, inline: true },
          { name: 'Left', value: `${stats.left}`, inline: true },
          { name: 'Fake', value: `${stats.fake}`, inline: true },
          { name: 'Valid Invites', value: `${stats.regular}`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Invites check error:', error);
      await replyError(target, 'There was an error fetching invite statistics.');
    }
  },

  async handleLeaderboard(target, args, client, isPrefix) {
    const limit = isPrefix
      ? parseInt(args[0]) || 10
      : target.options.getInteger('limit') || 10;

    if (limit < 5 || limit > 25) {
      return replyError(target, 'Limit must be between 5 and 25.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const topInviters = await getTopInviters(guildId, limit);

      if (topInviters.length === 0) {
        return replyError(target, 'No invite data found for this server.');
      }

      const leaderboardText = await Promise.all(
        topInviters.map(async (inviter, index) => {
          const user = await client.users.fetch(inviter.userId).catch(() => null);
          const username = user ? user.tag : 'Unknown User';
          return `**${index + 1}.** ${username} - ${inviter.count} invites`;
        })
      );

      const embed = {
        color: 0x5865F2,
        title: '🏆 Invite Leaderboard',
        description: leaderboardText.join('\n'),
        footer: { text: `Top ${topInviters.length} inviters in ${isPrefix ? target.guild.name : target.guild.name}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Invite leaderboard error:', error);
      await replyError(target, 'There was an error fetching the invite leaderboard.');
    }
  },

  async handleList(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first() || target.author
      : target.options.getUser('user') || target.user;

    const page = isPrefix
      ? parseInt(args[args.length - 1]) || 1
      : target.options.getInteger('page') || 1;

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const invites = await Invite.find({
        guildId,
        inviterId: user.id
      }).sort({ joinedAt: -1 });

      if (invites.length === 0) {
        return replyError(target, `${user.tag} has not invited anyone yet.`);
      }

      const pageSize = 10;
      const totalPages = Math.ceil(invites.length / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageInvites = invites.slice(start, end);

      const inviteList = pageInvites.map((inv) => {
        const status = inv.left ? '📤' : inv.fake ? '❌' : '✅';
        const date = `<t:${Math.floor(inv.joinedAt.getTime() / 1000)}:R>`;
        return `${status} **${inv.invitedUserTag}** - ${date}`;
      }).join('\n');

      const embed = {
        color: 0x5865F2,
        title: `${user.username}'s Invited Users`,
        description: inviteList || 'No invites on this page',
        fields: [
          { name: 'Total Invites', value: `${invites.length}`, inline: true },
          { name: 'Page', value: `${page}/${totalPages}`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Invitelist error:', error);
      await replyError(target, 'There was an error fetching the invite list.');
    }
  },

  async handleInvitedBy(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first() || target.author
      : target.options.getUser('user') || target.user;

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const invite = await Invite.findOne({
        guildId,
        invitedUserId: user.id
      }).sort({ joinedAt: -1 });

      if (!invite) {
        return replyError(target, `No invite data found for ${user.tag}.`);
      }

      const inviter = await client.users.fetch(invite.inviterId).catch(() => null);
      const inviterName = inviter ? inviter.tag : invite.inviterTag;

      const embed = {
        color: 0x5865F2,
        title: 'Invite Information',
        description: `Information about who invited ${user.tag}`,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'Invited User', value: user.tag, inline: true },
          { name: 'Invited By', value: inviterName, inline: true },
          { name: 'Join Date', value: `<t:${Math.floor(invite.joinedAt.getTime() / 1000)}:F>`, inline: false },
          { name: 'Invite Code', value: invite.inviteCode, inline: true },
          { name: 'Status', value: invite.left ? 'Left' : invite.fake ? 'Fake' : 'Active', inline: true }
        ],
        footer: { text: `Requested by ${isPrefix ? target.author.tag : target.user.tag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Invitedby error:', error);
      await replyError(target, 'There was an error fetching invite information.');
    }
  },

  async handleInviteCode(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first()
      : target.options.getUser('user');

    if (!user) {
      return replyError(target, 'Please specify a user.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const invite = await Invite.findOne({
        guildId,
        invitedUserId: user.id
      }).sort({ joinedAt: -1 });

      if (!invite) {
        return replyError(target, `No invite data found for ${user.tag}.`);
      }

      const embed = {
        color: 0x5865F2,
        title: '🔗 Invite Code',
        description: `Invite code used by ${user.tag}`,
        fields: [
          { name: '👤 User', value: user.tag, inline: true },
          { name: '🔗 Code', value: `\`${invite.inviteCode}\``, inline: true },
          { name: '📅 Joined', value: `<t:${Math.floor(invite.joinedAt.getTime() / 1000)}:R>`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Invitecode error:', error);
      await replyError(target, 'There was an error fetching the invite code.');
    }
  },

  async handleAdd(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? target.mentions.users.first()
      : target.options.getUser('user');

    if (!user) {
      return replyError(target, 'Please specify a user.');
    }

    const amount = isPrefix
      ? parseInt(args[1])
      : target.options.getInteger('amount');

    const type = isPrefix
      ? args[2]?.toLowerCase()
      : target.options.getString('type');

    if (!amount || amount < 1) {
      return replyError(target, 'Please provide a valid amount (minimum 1).');
    }

    if (!type || !['total', 'fake'].includes(type)) {
      return replyError(target, 'Type must be either `total` or `fake`.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const isFake = type === 'fake';

      for (let i = 0; i < amount; i++) {
        await Invite.create({
          guildId,
          inviterId: user.id,
          inviterTag: user.tag,
          invitedUserId: `fake_${Date.now()}_${i}`,
          invitedUserTag: `Fake User ${i + 1}`,
          inviteCode: 'manual_add',
          fake: isFake,
          joinedAt: new Date()
        });
      }

      const embed = {
        color: 0x5865F2,
        title: 'Invites Added',
        description: `Successfully added ${amount} ${type} invite${amount !== 1 ? 's' : ''} to ${user.tag}`,
        fields: [
          { name: 'User', value: user.tag, inline: true },
          { name: 'Amount', value: `${amount}`, inline: true },
          { name: 'Type', value: type, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Add invites error:', error);
      await replyError(target, 'There was an error adding invites.');
    }
  },

  async handleRemove(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? target.mentions.users.first()
      : target.options.getUser('user');

    if (!user) {
      return replyError(target, 'Please specify a user.');
    }

    const amount = isPrefix
      ? parseInt(args[1])
      : target.options.getInteger('amount');

    const type = isPrefix
      ? args[2]?.toLowerCase()
      : target.options.getString('type');

    if (!amount || amount < 1) {
      return replyError(target, 'Please provide a valid amount (minimum 1).');
    }

    if (!type || !['total', 'fake'].includes(type)) {
      return replyError(target, 'Type must be either `total` or `fake`.');
    }

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const isFake = type === 'fake';

      const invites = await Invite.find({
        guildId,
        inviterId: user.id,
        fake: isFake,
        left: false
      }).limit(amount);

      const deleteIds = invites.map(inv => inv._id);
      const result = await Invite.deleteMany({ _id: { $in: deleteIds } });

      const embed = {
        color: 0x5865F2,
        title: 'Invites Removed',
        description: `Successfully removed ${result.deletedCount} ${type} invite${result.deletedCount !== 1 ? 's' : ''} from ${user.tag}`,
        fields: [
          { name: 'User', value: user.tag, inline: true },
          { name: 'Amount', value: `${result.deletedCount}`, inline: true },
          { name: 'Type', value: type, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Remove invites error:', error);
      await replyError(target, 'There was an error removing invites.');
    }
  },

  async handleClear(target, args, client, isPrefix) {
    const hasPermission = isPrefix
      ? target.member.permissions.has(PermissionFlagsBits.Administrator)
      : target.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return replyError(target, 'You need Administrator permission to use this command.');
    }

    const user = isPrefix
      ? (args[0]?.toLowerCase() === 'all' ? null : target.mentions.users.first())
      : target.options.getUser('user');

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      let result;

      if (user) {
        result = await Invite.deleteMany({ guildId, inviterId: user.id });
      } else {
        result = await Invite.deleteMany({ guildId });
      }

      const embed = {
        color: 0x5865F2,
        title: 'Invites Cleared',
        description: user
          ? `Cleared all invites for ${user.tag}`
          : 'Cleared all invites for the entire server',
        fields: [
          { name: 'Invites Removed', value: `${result.deletedCount}`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Clear invites error:', error);
      await replyError(target, 'There was an error clearing invites.');
    }
  },

  async handleResetMy(target, args, client, isPrefix) {
    const userId = isPrefix ? target.author.id : target.user.id;
    const userTag = isPrefix ? target.author.tag : target.user.tag;

    try {
      const guildId = isPrefix ? target.guild.id : target.guild.id;
      const result = await Invite.deleteMany({ guildId, inviterId: userId });

      const embed = {
        color: 0x5865F2,
        title: 'Your Invites Reset',
        description: 'Successfully reset your invite count',
        fields: [
          { name: '📊 Invites Removed', value: `${result.deletedCount}`, inline: true }
        ],
        footer: { text: `Reset by ${userTag}` },
        timestamp: new Date().toISOString()
      };

      await replyWithCard(target, embed);

    } catch (error) {
      console.error('Reset my invites error:', error);
      await replyError(target, 'There was an error resetting your invites.');
    }
  }
};
