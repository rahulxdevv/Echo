const { getReactionRole } = require('../utils/reactionRole');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user, client) {
    if (user.bot) return;

    // Handle partials
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Something went wrong when fetching the message:', error);
        return;
      }
    }

    const { message } = reaction;
    if (!message.guildId) return;

    // The emoji can be either an ID (custom emoji) or a name (unicode emoji)
    const emojiId = reaction.emoji.id || reaction.emoji.name;

    const rr = await getReactionRole(message.guildId, message.id, emojiId);
    
    if (rr) {
      try {
        const member = await message.guild.members.fetch(user.id);
        const role = message.guild.roles.cache.get(rr.roleId);
        
        if (member && role) {
          await member.roles.remove(role);
        }
      } catch (error) {
        console.error('Failed to remove reaction role:', error);
      }
    }
  }
};
