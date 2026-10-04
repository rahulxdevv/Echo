const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');
const { Profile } = require('discord-arts');
const { replyError } = require('../../utils/respond');
const {
  getLevelConfig,
  updateLevelConfig,
  getUserLevel,
  getUserRank,
  getLeaderboard,
  calculateXpProgress,
  getRewardsForLevel
} = require('../../utils/levelling');
const { createLeaderboardCard } = require('../../utils/rankCard');
const UserLevel = require('../../models/UserLevel');

module.exports = {
  category: 'Levelling',
  name: 'level',
  description: 'Levelling system commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Levelling system commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('rank')
        .setDescription('View your or another user\'s rank card')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to view rank for')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addIntegerOption(option =>
          option
            .setName('page')
            .setDescription('Page number')
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup the levelling system')
        .addChannelOption(option =>
          option
            .setName('announce_channel')
            .setDescription('Channel for level up announcements (leave empty for same channel)')
            .addChannelTypes(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the levelling system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure levelling settings')
        .addStringOption(option =>
          option
            .setName('setting')
            .setDescription('Setting to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Message XP Min', value: 'message_xp_min' },
              { name: 'Message XP Max', value: 'message_xp_max' },
              { name: 'Message Cooldown (seconds)', value: 'message_cooldown' },
              { name: 'Voice XP Per Minute', value: 'voice_xp' },
              { name: 'Voice Cooldown (seconds)', value: 'voice_cooldown' },
              { name: 'XP Multiplier', value: 'xp_multiplier' },
              { name: 'Announce Message', value: 'announce_message' },
              { name: 'Stack Rewards', value: 'stack_rewards' },
              { name: 'Require Voice Activity', value: 'require_voice_activity' }
            )
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('New value')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reward')
        .setDescription('Manage level rewards')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('Level for the reward')
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to give as reward')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ignore')
        .setDescription('Ignore channels or roles from gaining XP')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add Channel', value: 'add_channel' },
              { name: 'Remove Channel', value: 'remove_channel' },
              { name: 'Add Role', value: 'add_role' },
              { name: 'Remove Role', value: 'remove_role' },
              { name: 'List', value: 'list' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to ignore')
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to ignore')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('multiplier')
        .setDescription('Set XP multiplier for a role')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' }
            )
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role for multiplier')
        )
        .addNumberOption(option =>
          option
            .setName('multiplier')
            .setDescription('Multiplier value (e.g., 1.5 for 50% bonus)')
            .setMinValue(0.1)
            .setMaxValue(10)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset levelling data')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('What to reset')
            .setRequired(true)
            .addChoices(
              { name: 'User', value: 'user' },
              { name: 'All Users', value: 'all' }
            )
        )
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to reset (for user type)')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set user XP or level (Admin only)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to modify')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('What to set')
            .setRequired(true)
            .addChoices(
              { name: 'XP', value: 'xp' },
              { name: 'Level', value: 'level' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Amount to set')
            .setRequired(true)
            .setMinValue(0)
        )
    ),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'rank':
        await this.handleRank(interaction, client);
        break;
      case 'leaderboard':
        await this.handleLeaderboard(interaction, client);
        break;
      case 'setup':
        await this.handleSetup(interaction, client);
        break;
      case 'toggle':
        await this.handleToggle(interaction, client);
        break;
      case 'config':
        await this.handleConfig(interaction, client);
        break;
      case 'reward':
        await this.handleReward(interaction, client);
        break;
      case 'ignore':
        await this.handleIgnore(interaction, client);
        break;
      case 'multiplier':
        await this.handleMultiplier(interaction, client);
        break;
      case 'reset':
        await this.handleReset(interaction, client);
        break;
      case 'set':
        await this.handleSet(interaction, client);
        break;
      default:
        await replyError(interaction, 'Unknown subcommand.');
    }
  },

  async handleRank(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply();

    try {
      const config = await getLevelConfig(interaction.guild.id);
      const userLevel = await getUserLevel(interaction.guild.id, user.id);
      const rank = await getUserRank(interaction.guild.id, user.id);
      const progress = calculateXpProgress(userLevel.totalXp, userLevel.level, config.levelFormula);

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const highestRole = member?.roles.cache
        .filter(role => role.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .first();

      const card = await Profile(user.id, {
        customTag: highestRole?.name || 'Member',
        font: 'ROBOTO',
        squareAvatar: true,
        presenceStatus: member?.presence?.status || 'offline',
        badgesFrame: true,
        customDate: `${userLevel.totalXp.toLocaleString()} total XP`,
        moreBackgroundBlur: true,
        backgroundBrightness: 100,
        rankData: {
          currentXp: progress.currentXp,
          requiredXp: progress.requiredXp,
          rank,
          level: userLevel.level,
          barColor: '#00f0b5',
          levelColor: '#f2f4f5',
          autoColorRank: true
        }
      });

      const attachment = new AttachmentBuilder(card, { name: `rank-${user.id}.png` });

      await interaction.editReply({
        files: [attachment]
      });
    } catch (error) {
      console.error('Rank error:', error);
      await replyError(interaction, 'Failed to generate rank card.');
    }
  },

  async handleLeaderboard(interaction, client) {
    const page = interaction.options.getInteger('page') || 1;
    const perPage = 10;
    const offset = (page - 1) * perPage;

    await interaction.deferReply();

    try {
      const users = await getLeaderboard(interaction.guild.id, perPage, offset);

      if (users.length === 0) {
        return replyError(interaction, 'No users found on the leaderboard.');
      }

      // Fetch user data
      const enrichedUsers = await Promise.all(
        users.map(async (userData, index) => {
          try {
            const user = await client.users.fetch(userData.userId);
            return {
              username: user.username,
              avatarUrl: user.displayAvatarURL({ extension: 'png', size: 128 }),
              level: userData.level,
              totalXp: userData.totalXp,
              rank: offset + index + 1
            };
          } catch (error) {
            return {
              username: 'Unknown User',
              avatarUrl: null,
              level: userData.level,
              totalXp: userData.totalXp,
              rank: offset + index + 1
            };
          }
        })
      );

      const card = await createLeaderboardCard({
        users: enrichedUsers,
        guildName: interaction.guild.name,
        guildIcon: interaction.guild.iconURL({ extension: 'png', size: 128 })
      });

      const attachment = new AttachmentBuilder(card, { name: `leaderboard-page${page}.png` });

      await interaction.editReply({
        content: `**Leaderboard - Page ${page}**`,
        files: [attachment]
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      await replyError(interaction, 'Failed to generate leaderboard.');
    }
  },

  async handleSetup(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const announceChannel = interaction.options.getChannel('announce_channel');

    await interaction.deferReply({ ephemeral: true });

    try {
      await updateLevelConfig(interaction.guild.id, {
        enabled: true,
        announceChannel: announceChannel?.id || null
      });

      await interaction.editReply({
        content: `**Levelling System Setup**\n\nStatus: Enabled\nAnnounce Channel: ${announceChannel || 'Same channel as message'}\n\nUsers will now gain XP from messages and voice chat!`
      });
    } catch (error) {
      console.error('Setup error:', error);
      await replyError(interaction, 'Failed to setup levelling system.');
    }
  },

  async handleToggle(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const enabled = interaction.options.getBoolean('enabled');

    await interaction.deferReply({ ephemeral: true });

    try {
      await updateLevelConfig(interaction.guild.id, { enabled });

      await interaction.editReply({
        content: `**Levelling System ${enabled ? 'Enabled' : 'Disabled'}**\n\nThe levelling system is now ${enabled ? 'active' : 'inactive'}.`
      });
    } catch (error) {
      console.error('Toggle error:', error);
      await replyError(interaction, 'Failed to toggle levelling system.');
    }
  },

  async handleConfig(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');

    await interaction.deferReply({ ephemeral: true });

    try {
      const updates = {};

      switch (setting) {
        case 'message_xp_min':
          updates.messageXpMin = parseInt(value);
          if (isNaN(updates.messageXpMin) || updates.messageXpMin < 1) {
            return replyError(interaction, 'Invalid value. Must be a positive number.');
          }
          break;

        case 'message_xp_max':
          updates.messageXpMax = parseInt(value);
          if (isNaN(updates.messageXpMax) || updates.messageXpMax < 1) {
            return replyError(interaction, 'Invalid value. Must be a positive number.');
          }
          break;

        case 'message_cooldown':
          updates.messageXpCooldown = parseInt(value);
          if (isNaN(updates.messageXpCooldown) || updates.messageXpCooldown < 0) {
            return replyError(interaction, 'Invalid value. Must be 0 or greater.');
          }
          break;

        case 'voice_xp':
          updates.voiceXpPerMinute = parseInt(value);
          if (isNaN(updates.voiceXpPerMinute) || updates.voiceXpPerMinute < 0) {
            return replyError(interaction, 'Invalid value. Must be 0 or greater.');
          }
          break;

        case 'voice_cooldown':
          updates.voiceXpCooldown = parseInt(value);
          if (isNaN(updates.voiceXpCooldown) || updates.voiceXpCooldown < 0) {
            return replyError(interaction, 'Invalid value. Must be 0 or greater.');
          }
          break;

        case 'xp_multiplier':
          updates.xpMultiplier = parseFloat(value);
          if (isNaN(updates.xpMultiplier) || updates.xpMultiplier <= 0) {
            return replyError(interaction, 'Invalid value. Must be greater than 0.');
          }
          break;

        case 'announce_message':
          updates.announceMessage = value;
          break;

        case 'stack_rewards':
          updates.stackRewards = value.toLowerCase() === 'true';
          break;

        case 'require_voice_activity':
          updates.requireVoiceActivity = value.toLowerCase() === 'true';
          break;
      }

      await updateLevelConfig(interaction.guild.id, updates);

      await interaction.editReply({
        content: `**Configuration Updated**\n\nSetting: ${setting.replace(/_/g, ' ')}\nNew Value: ${value}`
      });
    } catch (error) {
      console.error('Config error:', error);
      await replyError(interaction, 'Failed to update configuration.');
    }
  },

  async handleReward(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const action = interaction.options.getString('action');
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getLevelConfig(interaction.guild.id);

      if (action === 'add') {
        if (!level || !role) {
          return replyError(interaction, 'Please provide both level and role.');
        }

        // Check if reward already exists
        const existing = config.rewards.find(r => r.level === level && r.roleId === role.id);
        if (existing) {
          return replyError(interaction, 'This reward already exists.');
        }

        config.rewards.push({ level, roleId: role.id });
        await config.save();

        await interaction.editReply({
          content: `**Reward Added**\n\nLevel: ${level}\nRole: ${role}\n\nUsers who reach level ${level} will receive this role.`
        });
      } else if (action === 'remove') {
        if (!level || !role) {
          return replyError(interaction, 'Please provide both level and role.');
        }

        const index = config.rewards.findIndex(r => r.level === level && r.roleId === role.id);
        if (index === -1) {
          return replyError(interaction, 'Reward not found.');
        }

        config.rewards.splice(index, 1);
        await config.save();

        await interaction.editReply({
          content: `**Reward Removed**\n\nLevel: ${level}\nRole: ${role}`
        });
      } else if (action === 'list') {
        if (config.rewards.length === 0) {
          return interaction.editReply({
            content: '**No Rewards Configured**\n\nUse `/level reward add` to add rewards.'
          });
        }

        const rewardList = config.rewards
          .sort((a, b) => a.level - b.level)
          .map(r => `Level ${r.level}: <@&${r.roleId}>`)
          .join('\n');

        await interaction.editReply({
          content: `**Level Rewards**\n\n${rewardList}`
        });
      }
    } catch (error) {
      console.error('Reward error:', error);
      await replyError(interaction, 'Failed to manage rewards.');
    }
  },

  async handleIgnore(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getLevelConfig(interaction.guild.id);

      if (action === 'add_channel') {
        if (!channel) {
          return replyError(interaction, 'Please provide a channel.');
        }

        if (config.ignoredChannels.includes(channel.id)) {
          return replyError(interaction, 'This channel is already ignored.');
        }

        config.ignoredChannels.push(channel.id);
        await config.save();

        await interaction.editReply({
          content: `**Channel Ignored**\n\n${channel} will no longer give XP.`
        });
      } else if (action === 'remove_channel') {
        if (!channel) {
          return replyError(interaction, 'Please provide a channel.');
        }

        const index = config.ignoredChannels.indexOf(channel.id);
        if (index === -1) {
          return replyError(interaction, 'This channel is not ignored.');
        }

        config.ignoredChannels.splice(index, 1);
        await config.save();

        await interaction.editReply({
          content: `**Channel Unignored**\n\n${channel} will now give XP.`
        });
      } else if (action === 'add_role') {
        if (!role) {
          return replyError(interaction, 'Please provide a role.');
        }

        if (config.ignoredRoles.includes(role.id)) {
          return replyError(interaction, 'This role is already ignored.');
        }

        config.ignoredRoles.push(role.id);
        await config.save();

        await interaction.editReply({
          content: `**Role Ignored**\n\nUsers with ${role} will not gain XP.`
        });
      } else if (action === 'remove_role') {
        if (!role) {
          return replyError(interaction, 'Please provide a role.');
        }

        const index = config.ignoredRoles.indexOf(role.id);
        if (index === -1) {
          return replyError(interaction, 'This role is not ignored.');
        }

        config.ignoredRoles.splice(index, 1);
        await config.save();

        await interaction.editReply({
          content: `**Role Unignored**\n\nUsers with ${role} will now gain XP.`
        });
      } else if (action === 'list') {
        let content = '**Ignored Channels & Roles**\n\n';

        if (config.ignoredChannels.length > 0) {
          content += '**Channels:**\n' + config.ignoredChannels.map(id => `<#${id}>`).join('\n') + '\n\n';
        } else {
          content += '**Channels:** None\n\n';
        }

        if (config.ignoredRoles.length > 0) {
          content += '**Roles:**\n' + config.ignoredRoles.map(id => `<@&${id}>`).join('\n');
        } else {
          content += '**Roles:** None';
        }

        await interaction.editReply({ content });
      }
    } catch (error) {
      console.error('Ignore error:', error);
      await replyError(interaction, 'Failed to manage ignored channels/roles.');
    }
  },

  async handleMultiplier(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need Manage Server permission to use this command.');
    }

    const action = interaction.options.getString('action');
    const role = interaction.options.getRole('role');
    const multiplier = interaction.options.getNumber('multiplier');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getLevelConfig(interaction.guild.id);

      if (action === 'add') {
        if (!role || !multiplier) {
          return replyError(interaction, 'Please provide both role and multiplier.');
        }

        const existing = config.roleMultipliers.find(rm => rm.roleId === role.id);
        if (existing) {
          existing.multiplier = multiplier;
        } else {
          config.roleMultipliers.push({ roleId: role.id, multiplier });
        }

        await config.save();

        await interaction.editReply({
          content: `**Multiplier Set**\n\nRole: ${role}\nMultiplier: ${multiplier}x\n\nUsers with this role will gain ${multiplier}x XP.`
        });
      } else if (action === 'remove') {
        if (!role) {
          return replyError(interaction, 'Please provide a role.');
        }

        const index = config.roleMultipliers.findIndex(rm => rm.roleId === role.id);
        if (index === -1) {
          return replyError(interaction, 'No multiplier found for this role.');
        }

        config.roleMultipliers.splice(index, 1);
        await config.save();

        await interaction.editReply({
          content: `**Multiplier Removed**\n\nRole: ${role}`
        });
      } else if (action === 'list') {
        if (config.roleMultipliers.length === 0) {
          return interaction.editReply({
            content: '**No Multipliers Configured**\n\nUse `/level multiplier add` to add multipliers.'
          });
        }

        const multiplierList = config.roleMultipliers
          .map(rm => `<@&${rm.roleId}>: ${rm.multiplier}x`)
          .join('\n');

        await interaction.editReply({
          content: `**Role Multipliers**\n\n${multiplierList}`
        });
      }
    } catch (error) {
      console.error('Multiplier error:', error);
      await replyError(interaction, 'Failed to manage multipliers.');
    }
  },

  async handleReset(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(interaction, 'You need Administrator permission to use this command.');
    }

    const type = interaction.options.getString('type');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      if (type === 'user') {
        if (!user) {
          return replyError(interaction, 'Please provide a user.');
        }

        await UserLevel.findOneAndDelete({ guildId: interaction.guild.id, userId: user.id });

        await interaction.editReply({
          content: `**User Reset**\n\n${user}'s levelling data has been reset.`
        });
      } else if (type === 'all') {
        const result = await UserLevel.deleteMany({ guildId: interaction.guild.id });

        await interaction.editReply({
          content: `**All Users Reset**\n\n${result.deletedCount} user(s) levelling data has been reset.`
        });
      }
    } catch (error) {
      console.error('Reset error:', error);
      await replyError(interaction, 'Failed to reset levelling data.');
    }
  },

  async handleSet(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(interaction, 'You need Administrator permission to use this command.');
    }

    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await getLevelConfig(interaction.guild.id);
      const userLevel = await getUserLevel(interaction.guild.id, user.id);

      if (type === 'xp') {
        userLevel.totalXp = amount;
        userLevel.level = require('../../utils/levelling').calculateLevelFromXp(amount, config.levelFormula);
        userLevel.xp = require('../../utils/levelling').calculateXpProgress(amount, userLevel.level, config.levelFormula).currentXp;
      } else if (type === 'level') {
        let totalXp = 0;
        for (let i = 1; i <= amount; i++) {
          totalXp += require('../../utils/levelling').calculateXpForLevel(i, config.levelFormula);
        }
        userLevel.level = amount;
        userLevel.totalXp = totalXp;
        userLevel.xp = 0;
      }

      await userLevel.save();

      await interaction.editReply({
        content: `**User Updated**\n\n${user}'s ${type} has been set to ${amount}.`
      });
    } catch (error) {
      console.error('Set error:', error);
      await replyError(interaction, 'Failed to set user data.');
    }
  }
};
