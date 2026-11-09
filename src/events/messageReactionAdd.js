const { MessageFlags } = require('discord.js');
const { getReactionRole } = require('../utils/reactionRole');
const {
  getGiveawayByMessageId,
  claimDrop,
  buildGiveawayContainer,
  buildGiveawayPayload
} = require('../utils/giveaway');
const emojis = require('../utils/emojis');

module.exports = {
  name: 'messageReactionAdd',
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

    try {
      const giveaway = await getGiveawayByMessageId(message.id);

      if (giveaway && giveaway.type === 'drop' && !giveaway.ended) {
        const dropEmoji = giveaway.dropEmoji || emojis.common.gift;
        const reactedEmoji = reaction.emoji.id
          ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>`
          : reaction.emoji.name;

        if (reactedEmoji === dropEmoji) {
          if (giveaway.paused || giveaway.hostId === user.id) {
            return;
          }

          const claimed = await claimDrop(message.id, user.id);

          if (claimed) {
            const container = buildGiveawayContainer({
              prize: claimed.prize,
              winners: 1,
              endTime: claimed.endTime,
              hostId: claimed.hostId,
              participantsCount: 1,
              isEnded: true,
              isDrop: true,
              dropEmoji,
              winnerText: `<@${user.id}>`,
              banner: claimed.banner,
              thumbnail: claimed.thumbnail,
              color: claimed.color,
              title: claimed.title
            });

            await message.edit(buildGiveawayPayload(container)).catch(error => console.error('Gift drop message edit error:', error));

            await message.channel.send(
              `${emojis.common.celebration} <@${user.id}> won **${claimed.prize}**!`
            ).catch(error => console.error('Gift drop announcement error:', error));
          }

          return;
        }
      }
    } catch (error) {
      console.error('Gift drop reaction error:', error);
    }

    // The emoji can be either an ID (custom emoji) or a name (unicode emoji)
    const emojiId = reaction.emoji.id || reaction.emoji.name;

    const rr = await getReactionRole(message.guildId, message.id, emojiId);

    if (rr) {
      try {
        const member = await message.guild.members.fetch(user.id);
        const role = message.guild.roles.cache.get(rr.roleId);

        if (member && role) {
          await member.roles.add(role);
        }
      } catch (error) {
        console.error('Failed to add reaction role:', error);
      }
    }
  }
};
