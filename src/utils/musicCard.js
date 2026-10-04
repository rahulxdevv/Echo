const { AttachmentBuilder } = require('discord.js');
const { initializeFonts, Bloom } = require('musicard');

// Initialize fonts once
let fontsInitialized = false;

function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function createNowPlayingCard(track, position) {
  try {
    // Initialize fonts on first use
    if (!fontsInitialized) {
      await initializeFonts();
      fontsInitialized = true;
    }

    const duration = track.info.length || 0;
    const currentPosition = position || 0;

    // Calculate progress percentage (0-100)
    const progressPercentage = duration > 0 ? Math.min(100, Math.max(0, (currentPosition / duration) * 100)) : 0;

    const musicard = await Bloom({
      trackName: track.info.title || 'Unknown Song',
      artistName: track.info.author || 'Unknown Artist',
      albumArt: track.info.thumbnail || track.info.artworkUrl || '',
      isExplicit: false,
      timeAdjust: {
        timeStart: formatDuration(currentPosition),
        timeEnd: formatDuration(duration),
      },
      progressBar: Math.round(progressPercentage),
      volumeBar: 70,
    });

    return new AttachmentBuilder(musicard, { name: 'now-playing.png' });
  } catch (error) {
    console.error('Error creating music card:', error);
    throw error;
  }
}

module.exports = {
  createNowPlayingCard,
  formatDuration,
};
