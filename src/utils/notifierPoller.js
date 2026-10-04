const axios = require('axios');
const NotifierConfig = require('../models/NotifierConfig');
const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

let twitchToken = null;
let tokenExpiresAt = 0;

async function getTwitchToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) return null;

  if (twitchToken && Date.now() < tokenExpiresAt) return twitchToken;

  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`);
    twitchToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;
    return twitchToken;
  } catch (error) {
    console.error('Failed to get Twitch token:', error.message);
    return null;
  }
}

async function checkYouTube(config, client) {
  try {
    const { data } = await axios.get(`https://www.youtube.com/feeds/videos.xml?channel_id=${config.creatorId}`, {
      timeout: 5000
    });

    // Extremely basic XML parsing to find the latest video ID and Link
    const entryMatch = data.match(/<entry>[\s\S]*?<\/entry>/);
    if (!entryMatch) return;

    const entry = entryMatch[0];
    const idMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    if (!idMatch) return;

    const videoId = idMatch[1];
    
    // If it's the same as last time, ignore
    if (config.lastVideoId === videoId) return;

    // We have a new video!
    config.lastVideoId = videoId;
    await config.save();

    // Fetch the channel and send
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;
    
    const channel = guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'New Video';
    const link = `https://www.youtube.com/watch?v=${videoId}`;

    let msgText = config.message
      .replace(/{creator}/g, config.creatorId) // We'd ideally parse author name from XML too, but ID works
      .replace(/{link}/g, link)
      .replace(/{title}/g, title);

    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(msgText)
    );

    await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
  } catch (error) {
    // Ignore fetch errors, YT RSS can be flaky
  }
}

async function checkTwitch(config, client) {
  try {
    const token = await getTwitchToken();
    if (!token) return;

    const clientId = process.env.TWITCH_CLIENT_ID;
    const { data } = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${config.creatorId}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });

    if (data.data && data.data.length > 0) {
      const stream = data.data[0];
      const streamId = stream.id;

      if (config.lastVideoId === streamId) return;

      config.lastVideoId = streamId;
      await config.save();

      const guild = client.guilds.cache.get(config.guildId);
      if (!guild) return;
      
      const channel = guild.channels.cache.get(config.channelId);
      if (!channel) return;

      const link = `https://www.twitch.tv/${config.creatorId}`;

      let msgText = config.message
        .replace(/{creator}/g, stream.user_name || config.creatorId)
        .replace(/{link}/g, link)
        .replace(/{title}/g, stream.title || 'Stream');

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(msgText)
      );

      await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
  } catch (error) {
    // Ignore fetch errors
  }
}

function startPolling(client) {
  // Poll every 3 minutes
  setInterval(async () => {
    try {
      const configs = await NotifierConfig.find();
      for (const config of configs) {
        if (config.platform === 'youtube') {
          await checkYouTube(config, client);
        } else if (config.platform === 'twitch') {
          await checkTwitch(config, client);
        }
      }
    } catch (error) {
      console.error('Notifier Polling Error:', error);
    }
  }, 3 * 60 * 1000);
}

module.exports = { startPolling };
