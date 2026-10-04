const WelcomeConfig = require('../models/WelcomeConfig');

async function getWelcomeConfig(guildId) {
  let config = await WelcomeConfig.findOne({ guildId });

  if (!config) {
    config = await WelcomeConfig.create({ guildId });
  }

  return config;
}

async function updateWelcomeConfig(guildId, updates) {
  const config = await WelcomeConfig.findOneAndUpdate(
    { guildId },
    { ...updates, updatedAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  return config;
}

function replacePlaceholders(text, member, guild) {
  return text
    .replace(/{user}/g, member.user.username)
    .replace(/{mention}/g, `<@${member.user.id}>`)
    .replace(/{server}/g, guild.name)
    .replace(/{memberCount}/g, guild.memberCount.toString())
    .replace(/{tag}/g, member.user.tag);
}

module.exports = {
  getWelcomeConfig,
  updateWelcomeConfig,
  replacePlaceholders
};
