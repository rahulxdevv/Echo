const { MessageFlags } = require('discord.js');
const { updateSuggestionVote, getSuggestionByMessage } = require('../utils/suggestion');
const { createSuggestionCard } = require('../utils/suggestionCard');

module.exports = {
  name: 'suggestionInteraction',
  async handleVote(interaction, client) {
    const voteType = interaction.customId === 'suggestion_upvote' ? 'upvote' : 'downvote';
    
    // We defer update because editing the message with a new image might take a bit
    await interaction.deferUpdate();

    try {
      const suggestion = await getSuggestionByMessage(interaction.message.id);
      
      if (!suggestion) {
        return interaction.followUp({ content: 'This suggestion could not be found in the database.', ephemeral: true });
      }

      if (suggestion.status !== 'pending') {
        return interaction.followUp({ content: 'This suggestion has already been reviewed and cannot be voted on anymore.', ephemeral: true });
      }

      // Check if user already voted this
      const hasUpvoted = suggestion.upvotes.includes(interaction.user.id);
      const hasDownvoted = suggestion.downvotes.includes(interaction.user.id);
      
      let actualVoteType = voteType;
      
      // If they click the same button they already clicked, it acts as a toggle (removes vote)
      if ((voteType === 'upvote' && hasUpvoted) || (voteType === 'downvote' && hasDownvoted)) {
        actualVoteType = 'none';
      }

      const updatedSuggestion = await updateSuggestionVote(interaction.message.id, interaction.user.id, actualVoteType);

      if (!updatedSuggestion) {
        return interaction.followUp({ content: 'Failed to register vote.', ephemeral: true });
      }

      // Re-generate the card
      const author = await client.users.fetch(suggestion.authorId).catch(() => null);
      const username = author ? author.username : 'Unknown User';
      const avatarUrl = author ? author.displayAvatarURL({ extension: 'png', size: 256 }) : client.user.displayAvatarURL();

      const cardBuffer = await createSuggestionCard({
        username,
        avatarUrl,
        suggestionText: suggestion.suggestion,
        suggestionId: suggestion.suggestionId,
        upvotes: updatedSuggestion.upvotes.length,
        downvotes: updatedSuggestion.downvotes.length,
        status: suggestion.status
      });

      await interaction.message.edit({
        files: [{
          attachment: cardBuffer,
          name: 'suggestion.png'
        }]
      });

    } catch (error) {
      console.error('Suggestion vote error:', error);
      await interaction.followUp({ content: 'An error occurred while registering your vote.', ephemeral: true });
    }
  }
};
