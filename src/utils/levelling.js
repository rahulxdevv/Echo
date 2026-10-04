const LevelConfig = require('../models/LevelConfig');
const UserLevel = require('../models/UserLevel');

/**
 * Get or create level config for a guild
 */
async function getLevelConfig(guildId) {
  let config = await LevelConfig.findOne({ guildId });

  if (!config) {
    config = await LevelConfig.create({ guildId });
  }

  return config;
}

/**
 * Update level config
 */
async function updateLevelConfig(guildId, updates) {
  return await LevelConfig.findOneAndUpdate(
    { guildId },
    { ...updates, updatedAt: Date.now() },
    { new: true, upsert: true }
  );
}

/**
 * Get or create user level data
 */
async function getUserLevel(guildId, userId) {
  let userLevel = await UserLevel.findOne({ guildId, userId });

  if (!userLevel) {
    userLevel = await UserLevel.create({ guildId, userId });
  }

  return userLevel;
}

/**
 * Calculate XP required for a level based on formula
 */
function calculateXpForLevel(level, formula = 'default') {
  switch (formula) {
    case 'linear':
      return level * 100;

    case 'exponential':
      return Math.floor(100 * Math.pow(level, 1.5));

    case 'default':
    default:
      // 5 * (level ^ 2) + 50 * level + 100
      return 5 * Math.pow(level, 2) + 50 * level + 100;
  }
}

/**
 * Calculate level from total XP
 */
function calculateLevelFromXp(totalXp, formula = 'default') {
  let level = 0;
  let xpNeeded = 0;

  while (xpNeeded <= totalXp) {
    level++;
    xpNeeded += calculateXpForLevel(level, formula);
  }

  return Math.max(0, level - 1);
}

/**
 * Calculate XP progress for current level
 */
function calculateXpProgress(totalXp, level, formula = 'default') {
  let xpForCurrentLevel = 0;

  for (let i = 1; i <= level; i++) {
    xpForCurrentLevel += calculateXpForLevel(i, formula);
  }

  const currentLevelXp = totalXp - xpForCurrentLevel;
  const xpNeededForNext = calculateXpForLevel(level + 1, formula);

  return {
    currentXp: currentLevelXp,
    requiredXp: xpNeededForNext,
    percentage: Math.floor((currentLevelXp / xpNeededForNext) * 100)
  };
}

/**
 * Add XP to user and check for level up
 */
async function addXp(guildId, userId, xpAmount, config) {
  const userLevel = await getUserLevel(guildId, userId);

  const oldLevel = userLevel.level;
  userLevel.xp += xpAmount;
  userLevel.totalXp += xpAmount;

  // Calculate new level
  const newLevel = calculateLevelFromXp(userLevel.totalXp, config.levelFormula);

  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    userLevel.level = newLevel;
    userLevel.xp = calculateXpProgress(userLevel.totalXp, newLevel, config.levelFormula).currentXp;
  }

  userLevel.updatedAt = Date.now();
  await userLevel.save();

  return {
    userLevel,
    leveledUp,
    oldLevel,
    newLevel
  };
}

/**
 * Calculate XP multiplier for a member
 */
function calculateXpMultiplier(member, config) {
  let multiplier = config.xpMultiplier || 1;

  // Check role multipliers
  if (config.roleMultipliers && config.roleMultipliers.length > 0) {
    let highestRoleMultiplier = 0;

    for (const roleMultiplier of config.roleMultipliers) {
      if (member.roles.cache.has(roleMultiplier.roleId)) {
        highestRoleMultiplier = Math.max(highestRoleMultiplier, roleMultiplier.multiplier);
      }
    }

    if (highestRoleMultiplier > 0) {
      multiplier *= highestRoleMultiplier;
    }
  }

  return multiplier;
}

/**
 * Check if user is on cooldown
 */
function isOnCooldown(lastTime, cooldownSeconds) {
  if (!lastTime) return false;

  const now = Date.now();
  const timeSince = (now - lastTime.getTime()) / 1000;

  return timeSince < cooldownSeconds;
}

/**
 * Get leaderboard for a guild
 */
async function getLeaderboard(guildId, limit = 10, offset = 0) {
  const users = await UserLevel.find({ guildId })
    .sort({ totalXp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return users;
}

/**
 * Get user rank in guild
 */
async function getUserRank(guildId, userId) {
  const userLevel = await getUserLevel(guildId, userId);

  const rank = await UserLevel.countDocuments({
    guildId,
    totalXp: { $gt: userLevel.totalXp }
  });

  return rank + 1;
}

/**
 * Get level rewards for a specific level
 */
function getRewardsForLevel(config, level) {
  if (!config.rewards || config.rewards.length === 0) {
    return [];
  }

  return config.rewards.filter(reward => reward.level === level);
}

/**
 * Get all rewards up to a level (for stacking)
 */
function getAllRewardsUpToLevel(config, level) {
  if (!config.rewards || config.rewards.length === 0) {
    return [];
  }

  return config.rewards
    .filter(reward => reward.level <= level)
    .sort((a, b) => a.level - b.level);
}

/**
 * Apply level rewards to member
 */
async function applyLevelRewards(member, level, config) {
  const rewards = config.stackRewards
    ? getAllRewardsUpToLevel(config, level)
    : getRewardsForLevel(config, level);

  const addedRoles = [];
  const removedRoles = [];

  for (const reward of rewards) {
    try {
      const role = member.guild.roles.cache.get(reward.roleId);

      if (!role) continue;

      if (!member.roles.cache.has(reward.roleId)) {
        await member.roles.add(role);
        addedRoles.push(role);
      }

      // Remove previous level rewards if configured
      if (reward.removeOnLevelUp && !config.stackRewards) {
        const previousRewards = config.rewards.filter(r => r.level < level && r.removeOnLevelUp);

        for (const prevReward of previousRewards) {
          if (member.roles.cache.has(prevReward.roleId)) {
            await member.roles.remove(prevReward.roleId);
            removedRoles.push(prevReward.roleId);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to apply reward role ${reward.roleId}:`, error);
    }
  }

  return { addedRoles, removedRoles };
}

/**
 * Replace placeholders in level up message
 */
function replaceLevelPlaceholders(message, member, level, xp) {
  return message
    .replace(/{user}/g, member.user.username)
    .replace(/{mention}/g, `<@${member.id}>`)
    .replace(/{level}/g, level)
    .replace(/{xp}/g, xp)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{server}/g, member.guild.name);
}

module.exports = {
  getLevelConfig,
  updateLevelConfig,
  getUserLevel,
  calculateXpForLevel,
  calculateLevelFromXp,
  calculateXpProgress,
  addXp,
  calculateXpMultiplier,
  isOnCooldown,
  getLeaderboard,
  getUserRank,
  getRewardsForLevel,
  getAllRewardsUpToLevel,
  applyLevelRewards,
  replaceLevelPlaceholders
};
