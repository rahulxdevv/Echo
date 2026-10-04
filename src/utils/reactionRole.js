const ReactionRole = require('../models/ReactionRole');

async function addReactionRole(guildId, channelId, messageId, emoji, roleId) {
  const filter = { guildId, messageId, emoji };
  const update = { channelId, roleId };
  
  return ReactionRole.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });
}

async function removeReactionRole(guildId, messageId, emoji) {
  return ReactionRole.findOneAndDelete({ guildId, messageId, emoji });
}

async function getReactionRolesByMessage(guildId, messageId) {
  return ReactionRole.find({ guildId, messageId });
}

async function getReactionRole(guildId, messageId, emoji) {
  return ReactionRole.findOne({ guildId, messageId, emoji });
}

async function getGuildReactionRoles(guildId) {
  return ReactionRole.find({ guildId });
}

module.exports = {
  addReactionRole,
  removeReactionRole,
  getReactionRolesByMessage,
  getReactionRole,
  getGuildReactionRoles
};
