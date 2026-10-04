const StickyMessage = require('../models/StickyMessage');

async function getStickyMessage(channelId) {
  try {
    return await StickyMessage.findOne({ channelId });
  } catch (error) {
    console.error('Get sticky message error:', error);
    return null;
  }
}

async function createStickyMessage(guildId, channelId, message, createdBy) {
  try {
    const existing = await getStickyMessage(channelId);

    if (existing) {
      return { success: false, message: 'A sticky message already exists in this channel.' };
    }

    const sticky = await StickyMessage.create({
      guildId,
      channelId,
      message,
      createdBy,
      enabled: true
    });

    return { success: true, sticky };
  } catch (error) {
    console.error('Create sticky message error:', error);
    return { success: false, message: 'Failed to create sticky message.' };
  }
}

async function updateStickyMessage(channelId, message) {
  try {
    const sticky = await getStickyMessage(channelId);

    if (!sticky) {
      return { success: false, message: 'No sticky message found in this channel.' };
    }

    sticky.message = message;
    sticky.updatedAt = new Date();
    await sticky.save();

    return { success: true, sticky };
  } catch (error) {
    console.error('Update sticky message error:', error);
    return { success: false, message: 'Failed to update sticky message.' };
  }
}

async function deleteStickyMessage(channelId) {
  try {
    const sticky = await getStickyMessage(channelId);

    if (!sticky) {
      return { success: false, message: 'No sticky message found in this channel.' };
    }

    await StickyMessage.deleteOne({ channelId });
    return { success: true };
  } catch (error) {
    console.error('Delete sticky message error:', error);
    return { success: false, message: 'Failed to delete sticky message.' };
  }
}

async function toggleStickyMessage(channelId) {
  try {
    const sticky = await getStickyMessage(channelId);

    if (!sticky) {
      return { success: false, message: 'No sticky message found in this channel.' };
    }

    sticky.enabled = !sticky.enabled;
    await sticky.save();

    return { success: true, enabled: sticky.enabled };
  } catch (error) {
    console.error('Toggle sticky message error:', error);
    return { success: false, message: 'Failed to toggle sticky message.' };
  }
}

async function updateLastMessageId(channelId, messageId) {
  try {
    const sticky = await getStickyMessage(channelId);

    if (!sticky) return;

    sticky.lastMessageId = messageId;
    await sticky.save();
  } catch (error) {
    console.error('Update last message ID error:', error);
  }
}

async function getAllStickyMessages(guildId) {
  try {
    return await StickyMessage.find({ guildId });
  } catch (error) {
    console.error('Get all sticky messages error:', error);
    return [];
  }
}

module.exports = {
  getStickyMessage,
  createStickyMessage,
  updateStickyMessage,
  deleteStickyMessage,
  toggleStickyMessage,
  updateLastMessageId,
  getAllStickyMessages
};
