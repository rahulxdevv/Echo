const { getLevelConfig, getUserLevel, addXp, calculateXpMultiplier, isOnCooldown, applyLevelRewards, replaceLevelPlaceholders } = require('../utils/levelling');

// Track voice sessions
const voiceSessions = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    try {
      const member = newState.member;
      if (!member || member.user.bot) return;

      const guildId = newState.guild.id;
      const userId = member.id;
      const sessionKey = `${guildId}-${userId}`;

      const config = await getLevelConfig(guildId);

      // Check if levelling is enabled
      if (!config.enabled) return;

      // Check if user has ignored role
      if (config.ignoredRoles.some(roleId => member.roles.cache.has(roleId))) return;

      // User joined a voice channel
      if (!oldState.channel && newState.channel) {
        const userLevel = await getUserLevel(guildId, userId);
        userLevel.isInVoice = true;
        userLevel.voiceJoinTime = new Date();
        await userLevel.save();

        // Start tracking session
        voiceSessions.set(sessionKey, {
          joinTime: Date.now(),
          lastXpTime: Date.now(),
          channelId: newState.channel.id
        });
      }

      // User left a voice channel
      else if (oldState.channel && !newState.channel) {
        const session = voiceSessions.get(sessionKey);
        if (session) {
          // Award final XP
          await awardVoiceXp(member, session, config, true);
          voiceSessions.delete(sessionKey);
        }

        const userLevel = await getUserLevel(guildId, userId);
        userLevel.isInVoice = false;
        userLevel.voiceJoinTime = null;
        await userLevel.save();
      }

      // User switched channels or changed state (mute/deafen)
      else if (oldState.channel && newState.channel) {
        const session = voiceSessions.get(sessionKey);
        if (session) {
          // Update channel if switched
          if (oldState.channel.id !== newState.channel.id) {
            session.channelId = newState.channel.id;
          }

          // Award XP if state allows
          await awardVoiceXp(member, session, config, false);
        }
      }
    } catch (error) {
      console.error('Voice state update error:', error);
    }
  }
};

/**
 * Award voice XP to a member
 */
async function awardVoiceXp(member, session, config, isFinal = false) {
  try {
    const guildId = member.guild.id;
    const userId = member.id;

    // Check if channel is ignored
    if (config.ignoredChannels.includes(session.channelId)) return;

    // Check if XP is limited to specific channels
    if (config.xpChannels.length > 0 && !config.xpChannels.includes(session.channelId)) return;

    // Check if user is muted/deafened (if required)
    const voiceState = member.voice;
    if (config.requireVoiceActivity) {
      if (voiceState.mute || voiceState.deaf || voiceState.selfMute || voiceState.selfDeaf) {
        // Reset last XP time but don't award
        session.lastXpTime = Date.now();
        return;
      }
    }

    // Check if alone in channel
    const channel = member.guild.channels.cache.get(session.channelId);
    if (channel && channel.members.size <= 1) {
      session.lastXpTime = Date.now();
      return;
    }

    const now = Date.now();
    const timeSinceLastXp = (now - session.lastXpTime) / 1000; // seconds

    // Check cooldown
    if (!isFinal && timeSinceLastXp < config.voiceXpCooldown) return;

    // Calculate minutes in voice
    const minutesInVoice = timeSinceLastXp / 60;

    // Calculate XP
    const baseXp = Math.floor(minutesInVoice * config.voiceXpPerMinute);
    if (baseXp <= 0) return;

    const multiplier = calculateXpMultiplier(member, config);
    const xpAmount = Math.floor(baseXp * multiplier);

    // Update user level data
    const userLevel = await getUserLevel(guildId, userId);
    userLevel.voiceMinutes += minutesInVoice;
    userLevel.lastVoiceXp = new Date();
    await userLevel.save();

    // Add XP and check for level up
    const result = await addXp(guildId, userId, xpAmount, config);

    // Update session
    session.lastXpTime = now;

    // Handle level up
    if (result.leveledUp) {
      // Apply level rewards
      const { addedRoles } = await applyLevelRewards(member, result.newLevel, config);

      // Send level up announcement
      const announceMessage = replaceLevelPlaceholders(
        config.announceMessage,
        member,
        result.newLevel,
        result.userLevel.totalXp
      );

      // Add reward info to message
      let fullMessage = announceMessage;
      if (addedRoles.length > 0) {
        fullMessage += `\n🎁 **Rewards:** ${addedRoles.map(r => r.toString()).join(', ')}`;
      }

      // Send to announce channel
      if (config.announceChannel) {
        const announceChannelObj = member.guild.channels.cache.get(config.announceChannel);
        if (announceChannelObj) {
          await announceChannelObj.send(fullMessage);
        }
      }

      // Send DM if enabled
      if (config.announceDM) {
        try {
          await member.user.send(fullMessage);
        } catch (error) {
          console.error('Failed to send level up DM:', error);
        }
      }
    }
  } catch (error) {
    console.error('Award voice XP error:', error);
  }
}

// Periodic XP award for active voice users (every minute)
setInterval(async () => {
  for (const [sessionKey, session] of voiceSessions.entries()) {
    const [guildId, userId] = sessionKey.split('-');

    try {
      const guild = voiceSessions.get(sessionKey)?.guild;
      if (!guild) continue;

      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        voiceSessions.delete(sessionKey);
        continue;
      }

      const config = await getLevelConfig(guildId);
      await awardVoiceXp(member, session, config, false);
    } catch (error) {
      console.error('Periodic voice XP error:', error);
    }
  }
}, 60000); // Every 60 seconds
