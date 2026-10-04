const { SlashCommandBuilder } = require('discord.js');
const { formatDuration } = require('../../utils/musicCard');
const { createNowPlayingCard } = require('../../utils/musicCard');
const { replyError, replyNotice, replyWithCard } = require('../../utils/respond');

// Helper functions
function createTrackMessage(prefix, track) {
  return `${prefix} | **${track.info.title}** by **${track.info.author || 'Unknown artist'}** • ${formatDuration(track.info.length)}`;
}

function waitForConnection(player) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const checkPlayer = () => {
      if (player.connected) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > 10000) {
        reject(new Error('Player connection timeout'));
        return;
      }
      setTimeout(checkPlayer, 100);
    };
    checkPlayer();
  });
}

async function resolveQuery(client, requester, query) {
  return client.riffy.resolve({ query, requester });
}

function parseTimeString(timeStr) {
  const parts = timeStr.split(':').map(p => parseInt(p));
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes * 60 + seconds) * 1000;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }
  return null;
}

const FILTERS = {
  bassboost: { equalizer: [{ band: 0, gain: 0.6 }, { band: 1, gain: 0.67 }, { band: 2, gain: 0.67 }] },
  nightcore: { timescale: { speed: 1.12, pitch: 1.12, rate: 1 } },
  vaporwave: { timescale: { speed: 0.8, pitch: 0.8, rate: 1 } },
  '8d': { rotation: { rotationHz: 0.2 } },
  karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } },
  tremolo: { tremolo: { frequency: 4.0, depth: 0.75 } },
  vibrato: { vibrato: { frequency: 4.0, depth: 0.75 } },
  off: {}
};

module.exports = {
  category: 'Music',
  name: 'music',
  description: 'Music player commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music player commands')
    .addSubcommand(subcommand =>
      subcommand.setName('play').setDescription('Play a song or add it to the queue')
        .addStringOption(option => option.setName('query').setDescription('Song name or URL').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('pause').setDescription('Pause the currently playing song'))
    .addSubcommand(subcommand => subcommand.setName('resume').setDescription('Resume the paused song'))
    .addSubcommand(subcommand =>
      subcommand.setName('skip').setDescription('Skip the current song')
        .addIntegerOption(option => option.setName('amount').setDescription('Number of songs to skip').setMinValue(1).setMaxValue(10)))
    .addSubcommand(subcommand => subcommand.setName('stop').setDescription('Stop the music and clear the queue'))
    .addSubcommand(subcommand =>
      subcommand.setName('queue').setDescription('Show the current music queue')
        .addIntegerOption(option => option.setName('page').setDescription('Page number').setMinValue(1).setMaxValue(10)))
    .addSubcommand(subcommand => subcommand.setName('nowplaying').setDescription('Show currently playing song'))
    .addSubcommand(subcommand =>
      subcommand.setName('volume').setDescription('Adjust the music volume')
        .addIntegerOption(option => option.setName('level').setDescription('Volume level (0-100)').setMinValue(0).setMaxValue(100)))
    .addSubcommand(subcommand =>
      subcommand.setName('loop').setDescription('Toggle music loop mode')
        .addStringOption(option => option.setName('mode').setDescription('Loop mode')
          .addChoices(
            { name: 'Toggle Loop', value: 'toggle' },
            { name: 'Loop Queue', value: 'queue' },
            { name: 'Loop Song', value: 'song' },
            { name: 'Disable Loop', value: 'off' })))
    .addSubcommand(subcommand => subcommand.setName('shuffle').setDescription('Shuffle the music queue'))
    .addSubcommand(subcommand => subcommand.setName('clear').setDescription('Clear the entire music queue'))
    .addSubcommand(subcommand =>
      subcommand.setName('remove').setDescription('Remove a song from the queue')
        .addIntegerOption(option => option.setName('position').setDescription('Position of the song').setRequired(true).setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand.setName('seek').setDescription('Seek to a specific position')
        .addStringOption(option => option.setName('position').setDescription('Time position (e.g., 1:30)').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('replay').setDescription('Replay the current song from the beginning'))
    .addSubcommand(subcommand => subcommand.setName('previous').setDescription('Play the previous song'))
    .addSubcommand(subcommand => subcommand.setName('autoplay').setDescription('Toggle autoplay mode'))
    .addSubcommand(subcommand =>
      subcommand.setName('filters').setDescription('Apply audio filters')
        .addStringOption(option => option.setName('filter').setDescription('Filter to apply').setRequired(true)
          .addChoices(
            { name: 'Bass Boost', value: 'bassboost' },
            { name: 'Nightcore', value: 'nightcore' },
            { name: 'Vaporwave', value: 'vaporwave' },
            { name: '8D Audio', value: '8d' },
            { name: 'Karaoke', value: 'karaoke' },
            { name: 'Tremolo', value: 'tremolo' },
            { name: 'Vibrato', value: 'vibrato' },
            { name: 'Remove Filters', value: 'off' })))
    .addSubcommand(subcommand =>
      subcommand.setName('move').setDescription('Move a song to a different position')
        .addIntegerOption(option => option.setName('from').setDescription('Current position').setRequired(true).setMinValue(1))
        .addIntegerOption(option => option.setName('to').setDescription('New position').setRequired(true).setMinValue(1)))
    .addSubcommand(subcommand => subcommand.setName('disconnect').setDescription('Disconnect the bot from voice channel'))
    .addSubcommand(subcommand => subcommand.setName('lyrics').setDescription('Get lyrics for the current song')),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) return replyError(message, 'Please specify a subcommand. Use `!music play <song>` to play music.');

    switch (subcommand) {
      case 'play':
      case 'p':
        return this.handlePlay(message, args.slice(1), client, true);
      case 'pause':
        return this.handlePause(message, args.slice(1), client, true);
      case 'resume':
      case 'unpause':
        return this.handleResume(message, args.slice(1), client, true);
      case 'skip':
      case 's':
        return this.handleSkip(message, args.slice(1), client, true);
      case 'stop':
        return this.handleStop(message, args.slice(1), client, true);
      case 'queue':
      case 'q':
        return this.handleQueue(message, args.slice(1), client, true);
      case 'nowplaying':
      case 'np':
        return this.handleNowplaying(message, args.slice(1), client, true);
      case 'volume':
      case 'vol':
        return this.handleVolume(message, args.slice(1), client, true);
      case 'loop':
      case 'repeat':
        return this.handleLoop(message, args.slice(1), client, true);
      case 'shuffle':
        return this.handleShuffle(message, args.slice(1), client, true);
      case 'clear':
        return this.handleClear(message, args.slice(1), client, true);
      case 'remove':
      case 'rm':
        return this.handleRemove(message, args.slice(1), client, true);
      case 'seek':
        return this.handleSeek(message, args.slice(1), client, true);
      case 'replay':
        return this.handleReplay(message, args.slice(1), client, true);
      case 'previous':
      case 'prev':
        return this.handlePrevious(message, args.slice(1), client, true);
      case 'autoplay':
        return this.handleAutoplay(message, args.slice(1), client, true);
      case 'filters':
      case 'filter':
        return this.handleFilters(message, args.slice(1), client, true);
      case 'move':
        return this.handleMove(message, args.slice(1), client, true);
      case 'disconnect':
      case 'dc':
      case 'leave':
        return this.handleDisconnect(message, args.slice(1), client, true);
      case 'lyrics':
      case 'ly':
        return this.handleLyrics(message, args.slice(1), client, true);
      default:
        return replyError(message, `Unknown subcommand: ${subcommand}`);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'play':
        return this.handlePlay(interaction, [], client, false);
      case 'pause':
        return this.handlePause(interaction, [], client, false);
      case 'resume':
        return this.handleResume(interaction, [], client, false);
      case 'skip':
        return this.handleSkip(interaction, [], client, false);
      case 'stop':
        return this.handleStop(interaction, [], client, false);
      case 'queue':
        return this.handleQueue(interaction, [], client, false);
      case 'nowplaying':
        return this.handleNowplaying(interaction, [], client, false);
      case 'volume':
        return this.handleVolume(interaction, [], client, false);
      case 'loop':
        return this.handleLoop(interaction, [], client, false);
      case 'shuffle':
        return this.handleShuffle(interaction, [], client, false);
      case 'clear':
        return this.handleClear(interaction, [], client, false);
      case 'remove':
        return this.handleRemove(interaction, [], client, false);
      case 'seek':
        return this.handleSeek(interaction, [], client, false);
      case 'replay':
        return this.handleReplay(interaction, [], client, false);
      case 'previous':
        return this.handlePrevious(interaction, [], client, false);
      case 'autoplay':
        return this.handleAutoplay(interaction, [], client, false);
      case 'filters':
        return this.handleFilters(interaction, [], client, false);
      case 'move':
        return this.handleMove(interaction, [], client, false);
      case 'disconnect':
        return this.handleDisconnect(interaction, [], client, false);
      case 'lyrics':
        return this.handleLyrics(interaction, [], client, false);
    }
  },

  // Handlers
  async handlePlay(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) {
      return replyError(target, 'You need to be in a voice channel to play music.');
    }

    const permissions = voiceChannel.permissionsFor(target.guild.members.me);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return replyError(target, 'I need permission to connect and speak in your voice channel.');
    }

    const query = isPrefix ? args.join(' ') : target.options.getString('query');
    if (!query) {
      return replyError(target, 'Please provide a song name or URL.');
    }

    try {
      const player = client.riffy?.players.get(target.guild.id);
      const requester = isPrefix ? target.author : target.user;

      if (player && player.state !== 'DISCONNECTED') {
        const result = await resolveQuery(client, requester, query);
        const { loadType, tracks, playlistInfo } = result;

        if (loadType === 'playlist') {
          for (const track of tracks) {
            track.info.requester = requester;
            player.queue.add(track);
          }
          if (!player.playing && !player.paused) player.play();
          return replyNotice(target, `Added playlist to queue | **${playlistInfo.name}** • ${tracks.length} tracks`);
        }

        if (loadType === 'search' || loadType === 'track') {
          const track = tracks.shift();
          if (!track) return replyError(target, 'No results were found for that query.');
          track.info.requester = requester;
          player.queue.add(track);
          if (!player.playing && !player.paused) player.play();
          return replyNotice(target, createTrackMessage('Added in queue', track));
        }
        return replyError(target, 'No results were found for that query.');
      }

      const result = await resolveQuery(client, requester, query);
      const { loadType, tracks } = result;
      if (loadType !== 'search' && loadType !== 'track') {
        return replyError(target, 'No results were found for that query.');
      }

      const track = tracks[0];
      if (!track) return replyError(target, 'No results were found for that query.');

      const newPlayer = await client.riffy.createConnection({
        guildId: target.guild.id,
        voiceChannel: voiceChannel.id,
        textChannel: target.channel.id,
        deaf: true,
      });

      track.info.requester = requester;
      await waitForConnection(newPlayer);
      newPlayer.queue.add(track);

      setTimeout(() => {
        try {
          if (!newPlayer.playing && !newPlayer.paused) newPlayer.play();
        } catch (error) {
          console.error('Delayed play error:', error);
        }
      }, 350);

      return replyNotice(target, createTrackMessage('Now playing', track));
    } catch (error) {
      console.error('Play command error:', error);
      await replyError(target, 'An error occurred while trying to play that song.');
    }
  },

  async handlePause(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to pause music!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');
    if (player.paused) return replyError(target, 'The music is already paused!');

    try {
      player.pause(true);
      const embed = {
        color: 0x1DB954,
        title: 'Music Paused',
        description: 'The music has been paused.',
        fields: [
          { name: 'Current Song', value: player.current.info.title, inline: true },
          { name: '👤 Artist', value: player.current.info.author, inline: true },
          { name: '⏱️ Duration', value: formatDuration(player.current.info.length), inline: true }
        ],
        thumbnail: player.current.info.thumbnail ? { url: player.current.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Pause error:', error);
      await replyError(target, 'There was an error pausing the music!');
    }
  },

  async handleResume(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to resume music!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song to resume!');
    if (!player.paused) return replyError(target, 'The music is not paused!');

    try {
      player.pause(false);
      const embed = {
        color: 0x1DB954,
        title: 'Music Resumed',
        description: 'The music has been resumed.',
        fields: [
          { name: 'Current Song', value: player.current.info.title, inline: true },
          { name: '👤 Artist', value: player.current.info.author, inline: true },
          { name: '⏱️ Duration', value: formatDuration(player.current.info.length), inline: true }
        ],
        thumbnail: player.current.info.thumbnail ? { url: player.current.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Resume error:', error);
      await replyError(target, 'There was an error resuming the music!');
    }
  },

  async handleSkip(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to skip songs!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    try {
      const skipAmount = isPrefix ? parseInt(args[0]) || 1 : target.options.getInteger('amount') || 1;
      let skipped = 0;

      for (let i = 0; i < skipAmount; i++) {
        if (player.queue.size > 0 || i === 0) {
          player.stop();
          skipped++;
        } else {
          break;
        }
      }

      const embed = {
        color: 0x1DB954,
        title: 'Song Skipped',
        description: `Successfully skipped **${skipped}** song${skipped !== 1 ? 's' : ''}!`,
        fields: [
          { name: '📊 Queue Size', value: `${player.queue.size}`, inline: true },
          { name: 'Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Skip error:', error);
      await replyError(target, 'There was an error skipping the song!');
    }
  },

  async handleStop(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to stop music!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player) return replyError(target, 'There is no music playing right now!');

    try {
      player.destroy();
      const embed = {
        color: 0xFF4444,
        title: 'Music Stopped',
        description: 'Music has been stopped and queue has been cleared!',
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Stop error:', error);
      await replyError(target, 'There was an error stopping the music!');
    }
  },

  async handleQueue(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to see the queue!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || (!player.current && player.queue.size === 0)) {
      return replyError(target, 'The queue is empty! Add some songs with `!music play` or `/music play`');
    }

    try {
      const page = isPrefix ? parseInt(args[0]) || 1 : target.options.getInteger('page') || 1;
      const pageSize = 10;
      const totalPages = Math.ceil(player.queue.size / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const queue = player.queue.slice(start, end);
      const currentTrack = player.current;

      const embed = {
        color: 0x1DB954,
        title: 'Music Queue',
        description: `📊 Total songs: **${player.queue.size}**`,
        fields: [],
        thumbnail: currentTrack ? { url: currentTrack.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };

      if (currentTrack) {
        embed.fields.push({
          name: 'Currently Playing',
          value: `**${currentTrack.info.title}**\n👤 ${currentTrack.info.author}\n⏱️ ${formatDuration(currentTrack.info.length)}\n👤 Requested by: ${currentTrack.info.requester.username}`,
          inline: false
        });
      }

      if (queue.length > 0) {
        const queueList = queue.map((track, index) =>
          `**${start + index + 1}.** ${track.info.title} - ${track.info.author}`
        ).join('\n');
        embed.fields.push({
          name: `📋 Queue (Page ${page}/${totalPages})`,
          value: queueList || 'No more songs in queue',
          inline: false
        });
      }

      embed.footer = { text: totalPages > 1 ? `Page ${page} of ${totalPages}` : 'Queue' };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Queue error:', error);
      await replyError(target, 'There was an error getting the queue!');
    }
  },

  async handleNowplaying(target, args, client, isPrefix) {
    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now.');

    try {
      // Defer reply for slash commands to prevent timeout
      if (!isPrefix) {
        await target.deferReply();
      }

      const attachment = await createNowPlayingCard(player.current, player.position || 0);

      if (isPrefix) {
        await target.reply({ files: [attachment] });
      } else {
        await target.editReply({ files: [attachment] });
      }
    } catch (error) {
      console.error('Nowplaying error:', error);
      if (!isPrefix && target.deferred) {
        await target.editReply({ content: 'I could not generate the now playing card.' });
      } else {
        await replyError(target, 'I could not generate the now playing card.');
      }
    }
  },

  async handleVolume(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to adjust volume!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player) return replyError(target, 'There is no music playing right now!');

    try {
      const volume = isPrefix ? (args[0] ? parseInt(args[0]) : null) : target.options.getInteger('level');

      if (volume === null) {
        const currentVolume = player.volume || 100;
        const embed = {
          color: 0x1DB954,
          title: 'Current Volume',
          description: `Current volume is **${currentVolume}%**`,
          fields: [{ name: '🎵 Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }],
          timestamp: new Date().toISOString()
        };
        return replyWithCard(target, embed);
      }

      if (isNaN(volume) || volume < 0 || volume > 100) {
        return replyError(target, 'Please provide a volume level between 0 and 100!');
      }

      player.setVolume(volume);
      const embed = {
        color: 0x1DB954,
        title: 'Volume Adjusted',
        description: `Volume has been set to **${volume}%**`,
        fields: [
          { name: '📊 Current Volume', value: `${volume}%`, inline: true },
          { name: 'Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Volume error:', error);
      await replyError(target, 'There was an error adjusting the volume!');
    }
  },

  async handleLoop(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to use loop!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    try {
      const mode = isPrefix ? args[0]?.toLowerCase() || 'toggle' : target.options.getString('mode') || 'toggle';
      let newMode;
      let description;

      switch (mode) {
        case 'toggle':
          newMode = player.loop === 'none' ? 'queue' : 'none';
          description = player.loop === 'none' ? '🔂 Loop queue enabled' : '⏹ Loop disabled';
          break;
        case 'queue':
          newMode = 'queue';
          description = '🔂 Loop queue enabled';
          break;
        case 'song':
          newMode = 'song';
          description = 'Loop song enabled';
          break;
        case 'off':
          newMode = 'none';
          description = '⏹ Loop disabled';
          break;
        default:
          return replyError(target, 'Invalid mode! Use: toggle, queue, song, or off');
      }

      player.setLoop(newMode);
      const embed = {
        color: 0x1DB954,
        title: 'Loop Mode Changed',
        description: description,
        fields: [
          { name: '📊 Current Mode', value: newMode === 'none' ? 'Off' : newMode, inline: true },
          { name: '🎵 Now Playing', value: `${player.current.info.title} (${formatDuration(player.current.info.length)})`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Loop error:', error);
      await replyError(target, 'There was an error changing loop mode!');
    }
  },

  async handleShuffle(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to shuffle the queue!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || player.queue.size === 0) return replyError(target, 'The queue is empty! Add some songs first.');
    if (player.queue.size < 2) return replyError(target, 'Need at least 2 songs in the queue to shuffle!');

    try {
      const queueArray = [...player.queue];
      for (let i = queueArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queueArray[i], queueArray[j]] = [queueArray[j], queueArray[i]];
      }

      player.queue.clear();
      queueArray.forEach(track => player.queue.add(track));

      const embed = {
        color: 0x1DB954,
        title: '🔀 Queue Shuffled',
        description: 'The queue has been shuffled!',
        fields: [
          { name: '📊 Queue Size', value: `${player.queue.size} songs`, inline: true },
          { name: 'Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Shuffle error:', error);
      await replyError(target, 'There was an error shuffling the queue!');
    }
  },

  async handleClear(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to clear the queue!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || player.queue.size === 0) return replyError(target, 'The queue is already empty!');

    try {
      const clearedCount = player.queue.size;
      player.queue.clear();

      const embed = {
        color: 0x1DB954,
        title: '🗑️ Queue Cleared',
        description: `Cleared **${clearedCount}** song${clearedCount !== 1 ? 's' : ''} from the queue`,
        fields: [
          { name: '📊 Queue Size', value: '0 songs', inline: true },
          { name: 'Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Clear error:', error);
      await replyError(target, 'There was an error clearing the queue!');
    }
  },

  async handleRemove(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to remove songs!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || player.queue.size === 0) return replyError(target, 'The queue is empty!');

    const position = isPrefix ? parseInt(args[0]) : target.options.getInteger('position');
    if (!position || isNaN(position) || position < 1 || position > player.queue.size) {
      return replyError(target, `Invalid position! Must be between 1 and ${player.queue.size}`);
    }

    try {
      const queueArray = [...player.queue];
      const removedTrack = queueArray[position - 1];

      queueArray.splice(position - 1, 1);
      player.queue.clear();
      queueArray.forEach(t => player.queue.add(t));

      const embed = {
        color: 0x1DB954,
        title: '🗑️ Song Removed',
        description: `Removed **${removedTrack.info.title}** from the queue`,
        fields: [
          { name: '👤 Artist', value: `${removedTrack.info.author}`, inline: true },
          { name: '📊 Queue Size', value: `${player.queue.size} songs`, inline: true }
        ],
        thumbnail: removedTrack.info.thumbnail ? { url: removedTrack.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Remove error:', error);
      await replyError(target, 'There was an error removing the song!');
    }
  },

  async handleSeek(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to seek!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    const positionStr = isPrefix ? args[0] : target.options.getString('position');
    if (!positionStr) return replyError(target, 'Please provide a time position! (e.g., 1:30)');

    try {
      const position = parseTimeString(positionStr);
      if (position === null) {
        return replyError(target, 'Invalid time format! Use MM:SS or HH:MM:SS (e.g., 1:30)');
      }

      if (position < 0 || position > player.current.info.length) {
        return replyError(target, `Position must be between 0:00 and ${formatDuration(player.current.info.length)}!`);
      }

      player.seek(position);
      const embed = {
        color: 0x1DB954,
        title: '⏩ Position Changed',
        description: `Seeked to **${formatDuration(position)}**`,
        fields: [
          { name: '🎵 Current Song', value: `${player.current.info.title}`, inline: true },
          { name: '⏱️ Total Duration', value: `${formatDuration(player.current.info.length)}`, inline: true }
        ],
        thumbnail: player.current.info.thumbnail ? { url: player.current.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Seek error:', error);
      await replyError(target, 'There was an error seeking the song!');
    }
  },

  async handleReplay(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to replay songs!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    try {
      player.seek(0);
      const embed = {
        color: 0x1DB954,
        title: '🔁 Replaying Song',
        description: `Replaying **${player.current.info.title}** from the beginning`,
        fields: [
          { name: '👤 Artist', value: `${player.current.info.author}`, inline: true },
          { name: '⏱️ Duration', value: `${formatDuration(player.current.info.length)}`, inline: true }
        ],
        thumbnail: player.current.info.thumbnail ? { url: player.current.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Replay error:', error);
      await replyError(target, 'There was an error replaying the song!');
    }
  },

  async handlePrevious(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to use this command!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    try {
      if (!player.previous || player.previous.length === 0) {
        return replyError(target, 'There is no previous song!');
      }

      const previousTrack = player.previous[player.previous.length - 1];
      player.queue.unshift(player.current);
      player.queue.unshift(previousTrack);
      player.stop();

      const embed = {
        color: 0x1DB954,
        title: '⏮️ Playing Previous Song',
        description: `Now playing **${previousTrack.info.title}**`,
        fields: [
          { name: '👤 Artist', value: `${previousTrack.info.author}`, inline: true },
          { name: '⏱️ Duration', value: `${formatDuration(previousTrack.info.length)}`, inline: true }
        ],
        thumbnail: previousTrack.info.thumbnail ? { url: previousTrack.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Previous error:', error);
      await replyError(target, 'There was an error playing the previous song!');
    }
  },

  async handleAutoplay(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to use autoplay!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player) return replyError(target, 'There is no active music player!');

    try {
      const newState = !player.isAutoplay;
      player.setAutoplay(newState);

      const embed = {
        color: 0x1DB954,
        title: '🔄 Autoplay Mode',
        description: newState
          ? '✅ Autoplay has been **enabled**\nRelated songs will play automatically when the queue ends.'
          : '❌ Autoplay has been **disabled**\nMusic will stop when the queue ends.',
        fields: [
          { name: '📊 Status', value: newState ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Now Playing', value: player.current ? player.current.info.title : 'Nothing', inline: true }
        ],
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Autoplay error:', error);
      await replyError(target, 'There was an error toggling autoplay!');
    }
  },

  async handleFilters(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to use filters!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    const filterName = isPrefix ? args[0]?.toLowerCase() : target.options.getString('filter');
    if (!filterName) {
      const filterList = Object.keys(FILTERS).filter(f => f !== 'off').join(', ');
      return replyError(target, `Please specify a filter!\nAvailable filters: ${filterList}, off`);
    }

    const filter = FILTERS[filterName];
    if (!filter) {
      const filterList = Object.keys(FILTERS).filter(f => f !== 'off').join(', ');
      return replyError(target, `Invalid filter!\nAvailable filters: ${filterList}, off`);
    }

    try {
      player.setFilters(filter);
      const embed = {
        color: 0x1DB954,
        title: '🎛️ Audio Filter Applied',
        description: filterName === 'off'
          ? '✅ All filters have been removed'
          : `✅ Applied **${filterName}** filter`,
        fields: [
          { name: 'Current Song', value: player.current.info.title, inline: true },
          { name: '🎚️ Active Filter', value: filterName === 'off' ? 'None' : filterName, inline: true }
        ],
        thumbnail: player.current.info.thumbnail ? { url: player.current.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Filters error:', error);
      await replyError(target, 'There was an error applying the filter!');
    }
  },

  async handleMove(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to move songs!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player || player.queue.size === 0) return replyError(target, 'The queue is empty!');

    const fromPos = isPrefix ? parseInt(args[0]) : target.options.getInteger('from');
    const toPos = isPrefix ? parseInt(args[1]) : target.options.getInteger('to');

    if (!fromPos || !toPos || isNaN(fromPos) || isNaN(toPos) || fromPos < 1 || toPos < 1 || fromPos > player.queue.size || toPos > player.queue.size) {
      return replyError(target, `Invalid positions! Both must be between 1 and ${player.queue.size}`);
    }

    if (fromPos === toPos) {
      return replyError(target, 'The song is already at that position!');
    }

    try {
      const queueArray = [...player.queue];
      const movedTrack = queueArray[fromPos - 1];

      queueArray.splice(fromPos - 1, 1);
      queueArray.splice(toPos - 1, 0, movedTrack);

      player.queue.clear();
      queueArray.forEach(track => player.queue.add(track));

      const embed = {
        color: 0x1DB954,
        title: '🔄 Song Moved',
        description: `Moved **${movedTrack.info.title}** from position **${fromPos}** to **${toPos}**`,
        fields: [
          { name: '👤 Artist', value: `${movedTrack.info.author}`, inline: true },
          { name: '📊 Queue Size', value: `${player.queue.size} songs`, inline: true }
        ],
        thumbnail: movedTrack.info.thumbnail ? { url: movedTrack.info.thumbnail } : null,
        timestamp: new Date().toISOString()
      };
      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Move error:', error);
      await replyError(target, 'There was an error moving the song!');
    }
  },

  async handleDisconnect(target, args, client, isPrefix) {
    const voiceChannel = target.member.voice.channel;
    if (!voiceChannel) return replyError(target, 'You need to be in a voice channel to disconnect the bot!');

    const player = client.riffy?.players.get(target.guild.id);
    if (!player) return replyError(target, 'The bot is not connected to a voice channel!');

    try {
      const queueSize = player.queue.size;
      const wasPlaying = player.current ? player.current.info.title : null;

      player.destroy();

      const embed = {
        color: 0x1DB954,
        title: '👋 Disconnected',
        description: 'Successfully disconnected from the voice channel',
        fields: [
          { name: '📊 Songs Cleared', value: `${queueSize} songs`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      if (wasPlaying) {
        embed.fields.push({ name: '🎵 Was Playing', value: wasPlaying, inline: true });
      }

      await replyWithCard(target, embed);
    } catch (error) {
      console.error('Disconnect error:', error);
      await replyError(target, 'There was an error disconnecting!');
    }
  },

  async handleLyrics(target, args, client, isPrefix) {
    const player = client.riffy?.players.get(target.guild.id);
    if (!player || !player.current) return replyError(target, 'There is no song playing right now!');

    try {
      // Defer reply for slash commands to prevent timeout
      if (!isPrefix) {
        await target.deferReply();
      }

      const track = player.current;
      const lyrics = await this.searchLyrics(track.info.title, track.info.author);

      if (!lyrics) {
        const errorMsg = `Could not find lyrics for **${track.info.title}** by **${track.info.author}**!`;
        if (!isPrefix && target.deferred) {
          return target.editReply({ content: errorMsg });
        }
        return replyError(target, errorMsg);
      }

      const maxChars = 4000;
      const lyricsChunks = [];
      for (let i = 0; i < lyrics.length; i += maxChars) {
        lyricsChunks.push(lyrics.substring(i, i + maxChars));
      }

      const content = [
        `# Lyrics - ${track.info.title}\n`,
        `**Artist:** ${track.info.author}`,
        `**Song:** ${track.info.title}\n`,
        `${lyricsChunks[0].substring(0, 3800)}`
      ].join('\n');

      const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require('discord.js');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      if (!isPrefix && target.deferred) {
        await target.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });

        for (let i = 1; i < lyricsChunks.length; i++) {
          await target.channel.send(`\`\`\`${lyricsChunks[i].substring(0, 1990)}\`\`\``);
        }
      } else {
        await target.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });

        for (let i = 1; i < lyricsChunks.length; i++) {
          await target.channel.send(`\`\`\`${lyricsChunks[i].substring(0, 1990)}\`\`\``);
        }
      }
    } catch (error) {
      console.error('Lyrics error:', error);
      if (!isPrefix && target.deferred) {
        await target.editReply({ content: 'There was an error getting lyrics!' });
      } else {
        await replyError(target, 'There was an error getting lyrics!');
      }
    }
  },

  async searchLyrics(title, artist) {
    try {
      const axios = require('axios');

      // Try lyrics.ovh API (free, no key required)
      const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
        timeout: 10000
      });

      if (response.data && response.data.lyrics) {
        return response.data.lyrics.trim();
      }

      return null;
    } catch (error) {
      console.error('Lyrics API error:', error.message);

      // Fallback message
      return `Lyrics for "${title}" by ${artist} are not available.\n\nTry searching on:\n• Genius.com\n• AZLyrics.com\n• Google Search`;
    }
  },
};
