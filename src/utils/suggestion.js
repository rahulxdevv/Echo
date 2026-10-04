const SuggestionConfig = require('../models/SuggestionConfig');
const Suggestion = require('../models/Suggestion');

async function getSuggestionConfig(guildId) {
  let config = await SuggestionConfig.findOne({ guildId });
  if (!config) {
    config = new SuggestionConfig({ guildId });
    await config.save();
  }
  return config;
}

async function updateSuggestionConfig(guildId, updates) {
  const config = await getSuggestionConfig(guildId);
  Object.assign(config, updates);
  await config.save();
  return config;
}

function generateSuggestionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createSuggestionRecord(guildId, messageId, authorId, text) {
  const suggestion = new Suggestion({
    guildId,
    messageId,
    suggestionId: generateSuggestionId(),
    authorId,
    suggestion: text,
  });
  await suggestion.save();
  return suggestion;
}

async function getSuggestionByMessage(messageId) {
  return Suggestion.findOne({ messageId });
}

async function updateSuggestionVote(messageId, userId, voteType) {
  const suggestion = await getSuggestionByMessage(messageId);
  if (!suggestion) return null;

  // Remove existing vote if any
  suggestion.upvotes = suggestion.upvotes.filter((id) => id !== userId);
  suggestion.downvotes = suggestion.downvotes.filter((id) => id !== userId);

  // Add new vote if it wasn't a toggle off
  if (voteType === 'upvote') {
    suggestion.upvotes.push(userId);
  } else if (voteType === 'downvote') {
    suggestion.downvotes.push(userId);
  }

  await suggestion.save();
  return suggestion;
}

module.exports = {
  getSuggestionConfig,
  updateSuggestionConfig,
  createSuggestionRecord,
  getSuggestionByMessage,
  updateSuggestionVote,
};
