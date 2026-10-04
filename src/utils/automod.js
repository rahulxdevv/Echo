const AutoMod = require('../models/AutoMod');

async function getAutoModConfig(guildId) {
  let config = await AutoMod.findOne({ guildId });

  if (!config) {
    config = await AutoMod.create({ guildId });
  }

  return config;
}

async function updateAutoModConfig(guildId, updates) {
  const config = await AutoMod.findOneAndUpdate(
    { guildId },
    { ...updates, updatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  return config;
}

function containsInvite(content) {
  const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
  return inviteRegex.test(content);
}

function containsLink(content) {
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  return linkRegex.test(content);
}

function extractLinks(content) {
  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  return content.match(linkRegex) || [];
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

function containsBadWords(content, badWords) {
  const lowerContent = content.toLowerCase();
  return badWords.some(word => {
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
    return regex.test(lowerContent);
  });
}

function calculateCapsPercentage(content) {
  const letters = content.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;

  const caps = content.replace(/[^A-Z]/g, '');
  return (caps.length / letters.length) * 100;
}

function isIgnored(member, config) {
  // Check if user has ignored role
  if (config.ignoredRoles.some(roleId => member.roles.cache.has(roleId))) {
    return true;
  }

  // Check if user has admin permissions
  if (member.permissions.has('Administrator')) {
    return true;
  }

  return false;
}

module.exports = {
  getAutoModConfig,
  updateAutoModConfig,
  containsInvite,
  containsLink,
  extractLinks,
  extractDomain,
  containsBadWords,
  calculateCapsPercentage,
  isIgnored
};
