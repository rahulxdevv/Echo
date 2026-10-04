const Invite = require('../models/Invite');
const InviteTracker = require('../models/InviteTracker');

async function getInviteStats(guildId, userId) {
  const invites = await Invite.find({ guildId, inviterId: userId });

  const total = invites.length;
  const left = invites.filter(inv => inv.left).length;
  const fake = invites.filter(inv => inv.fake).length;
  const regular = total - left - fake;

  return {
    total,
    regular,
    left,
    fake,
    invites
  };
}

async function getTopInviters(guildId, limit = 10) {
  const invites = await Invite.find({ guildId, left: false, fake: false });

  const inviterMap = new Map();

  for (const invite of invites) {
    const count = inviterMap.get(invite.inviterId) || 0;
    inviterMap.set(invite.inviterId, count + 1);
  }

  const sorted = Array.from(inviterMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  return sorted.map(([userId, count]) => ({ userId, count }));
}

async function recordInvite(guildId, inviterId, inviterTag, invitedUserId, invitedUserTag, inviteCode, isFake = false) {
  const invite = await Invite.create({
    guildId,
    inviterId,
    inviterTag,
    invitedUserId,
    invitedUserTag,
    inviteCode,
    fake: isFake,
    joinedAt: new Date()
  });

  return invite;
}

async function markInviteAsLeft(guildId, invitedUserId) {
  const invite = await Invite.findOne({
    guildId,
    invitedUserId,
    left: false
  }).sort({ joinedAt: -1 });

  if (invite) {
    invite.left = true;
    invite.leftAt = new Date();
    await invite.save();
    return invite;
  }

  return null;
}

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const inviteMap = new Map();

    invites.forEach(invite => {
      inviteMap.set(invite.code, {
        code: invite.code,
        inviterId: invite.inviterId,
        uses: invite.uses
      });
    });

    await InviteTracker.findOneAndUpdate(
      { guildId: guild.id },
      {
        guildId: guild.id,
        invites: inviteMap,
        lastUpdated: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    return inviteMap;
  } catch (error) {
    if (error.code === 50013) {
      // Missing Permissions - silently skip this guild
      return new Map();
    }
    console.error('Error caching guild invites:', error);
    return new Map();
  }
}

async function getCachedInvites(guildId) {
  const tracker = await InviteTracker.findOne({ guildId });
  return tracker ? tracker.invites : new Map();
}

async function findUsedInvite(guild, cachedInvites) {
  try {
    const currentInvites = await guild.invites.fetch();

    for (const [code, currentInvite] of currentInvites) {
      const cached = cachedInvites.get(code);

      if (cached && currentInvite.uses > cached.uses) {
        return {
          code: currentInvite.code,
          inviterId: currentInvite.inviterId,
          inviter: currentInvite.inviter,
          uses: currentInvite.uses
        };
      }
    }

    for (const [code, cached] of cachedInvites) {
      if (!currentInvites.has(code)) {
        return {
          code: cached.code,
          inviterId: cached.inviterId,
          inviter: null,
          uses: cached.uses + 1
        };
      }
    }

    return null;
  } catch (error) {
    if (error.code === 50013) {
      // Missing Permissions - silently return null
      return null;
    }
    console.error('Error finding used invite:', error);
    return null;
  }
}

async function resetInvites(guildId, userId) {
  const result = await Invite.deleteMany({ guildId, inviterId: userId });
  return result.deletedCount;
}

async function isInviteTrackerEnabled(guildId) {
  const tracker = await InviteTracker.findOne({ guildId });
  return tracker ? tracker.enabled : true;
}

async function setInviteTrackerEnabled(guildId, enabled) {
  await InviteTracker.findOneAndUpdate(
    { guildId },
    { guildId, enabled },
    { upsert: true, returnDocument: 'after' }
  );
}

module.exports = {
  getInviteStats,
  getTopInviters,
  recordInvite,
  markInviteAsLeft,
  cacheGuildInvites,
  getCachedInvites,
  findUsedInvite,
  resetInvites,
  isInviteTrackerEnabled,
  setInviteTrackerEnabled
};
