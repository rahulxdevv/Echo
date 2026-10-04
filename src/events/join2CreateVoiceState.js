const {
  cleanupTemporaryVoice,
  createTemporaryVoice,
  getJoin2CreateConfig
} = require('../utils/join2create');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      if (newState.channelId && oldState.channelId !== newState.channelId) {
        const config = await getJoin2CreateConfig(newState.guild.id);

        if (config.enabled && config.joinChannelId === newState.channelId) {
          await createTemporaryVoice(member, config);
          return;
        }
      }

      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        setTimeout(() => {
          cleanupTemporaryVoice(oldState.channel).catch(error => {
            console.error('Join2Create cleanup error:', error);
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Join2Create voice state error:', error);
    }
  }
};
