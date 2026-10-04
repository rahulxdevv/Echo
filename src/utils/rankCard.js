const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Create a rank card image
 * @param {Object} options - Rank card options
 * @param {string} options.username - Username to display
 * @param {string} options.avatarUrl - Avatar URL
 * @param {number} options.level - User level
 * @param {number} options.rank - User rank position
 * @param {number} options.currentXp - Current XP in level
 * @param {number} options.requiredXp - XP required for next level
 * @param {number} options.totalXp - Total XP earned
 * @param {number} options.messageCount - Total messages sent
 * @param {number} options.voiceMinutes - Total voice minutes
 * @param {string} options.accentColor - Accent color (default: '#5865F2')
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function createRankCard(options) {
  const {
    username,
    avatarUrl,
    level,
    rank,
    currentXp,
    requiredXp,
    totalXp,
    messageCount = 0,
    voiceMinutes = 0,
    accentColor = '#5865F2'
  } = options;

  const width = 934;
  const height = 282;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#23272A');
  gradient.addColorStop(1, '#2C2F33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Card border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Avatar circle background
  ctx.beginPath();
  ctx.arc(141, 141, 100, 0, Math.PI * 2);
  ctx.fillStyle = '#2C2F33';
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Load and draw avatar
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(141, 141, 94, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const scale = Math.max(188 / avatar.width, 188 / avatar.height);
    const scaledWidth = avatar.width * scale;
    const scaledHeight = avatar.height * scale;
    const x = 141 - scaledWidth / 2;
    const y = 141 - scaledHeight / 2;

    ctx.drawImage(avatar, x, y, scaledWidth, scaledHeight);
    ctx.restore();
  } catch (error) {
    console.error('Failed to load avatar for rank card:', error);
  }

  // Username
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(username, 270, 70);

  // Rank and Level
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 28px Arial';
  ctx.fillText(`RANK #${rank}`, 270, 110);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  const rankWidth = ctx.measureText(`RANK #${rank}`).width;
  ctx.fillText(`LEVEL ${level}`, 270 + rankWidth + 30, 110);

  // Stats
  ctx.fillStyle = '#B9BBBE';
  ctx.font = '20px Arial';
  ctx.fillText(`Total XP: ${totalXp.toLocaleString()}`, 270, 145);
  ctx.fillText(`Messages: ${messageCount.toLocaleString()}`, 270, 175);
  ctx.fillText(`Voice: ${Math.floor(voiceMinutes).toLocaleString()} min`, 270, 205);

  // Progress bar background
  const barX = 270;
  const barY = 225;
  const barWidth = 630;
  const barHeight = 30;

  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Progress bar fill
  const progress = Math.min(currentXp / requiredXp, 1);
  const fillWidth = barWidth * progress;

  const progressGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
  progressGradient.addColorStop(0, accentColor);
  progressGradient.addColorStop(1, lightenColor(accentColor, 20));
  ctx.fillStyle = progressGradient;
  ctx.fillRect(barX, barY, fillWidth, barHeight);

  // Progress bar border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // XP text on progress bar
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${currentXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`,
    barX + barWidth / 2,
    barY + barHeight / 2 + 6
  );

  return canvas.toBuffer('image/png');
}

/**
 * Lighten a hex color
 */
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

/**
 * Create a leaderboard image
 * @param {Object} options - Leaderboard options
 * @param {Array} options.users - Array of user data
 * @param {string} options.guildName - Guild name
 * @param {string} options.guildIcon - Guild icon URL
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function createLeaderboardCard(options) {
  const {
    users,
    guildName,
    guildIcon
  } = options;

  const width = 800;
  const entryHeight = 80;
  const headerHeight = 120;
  const height = headerHeight + (users.length * entryHeight) + 40;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#23272A');
  gradient.addColorStop(1, '#2C2F33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = '#5865F2';
  ctx.fillRect(0, 0, width, headerHeight);

  // Guild icon
  if (guildIcon) {
    try {
      const icon = await loadImage(guildIcon);
      ctx.save();
      ctx.beginPath();
      ctx.arc(60, 60, 40, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(icon, 20, 20, 80, 80);
      ctx.restore();
    } catch (error) {
      console.error('Failed to load guild icon:', error);
    }
  }

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('🏆 Leaderboard', 120, 55);

  ctx.font = '20px Arial';
  ctx.fillText(guildName, 120, 85);

  // Draw users
  let yOffset = headerHeight + 20;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const rank = i + 1;

    // Entry background
    ctx.fillStyle = i % 2 === 0 ? '#2C2F33' : '#23272A';
    ctx.fillRect(20, yOffset, width - 40, entryHeight - 10);

    // Rank
    ctx.fillStyle = rank <= 3 ? '#FFD700' : '#B9BBBE';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`#${rank}`, 40, yOffset + 45);

    // Avatar
    if (user.avatarUrl) {
      try {
        const avatar = await loadImage(user.avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(140, yOffset + 35, 25, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 115, yOffset + 10, 50, 50);
        ctx.restore();
      } catch (error) {
        console.error('Failed to load user avatar:', error);
      }
    }

    // Username
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(user.username, 190, yOffset + 35);

    // Level
    ctx.fillStyle = '#5865F2';
    ctx.font = '20px Arial';
    ctx.fillText(`Level ${user.level}`, 190, yOffset + 58);

    // XP
    ctx.fillStyle = '#B9BBBE';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${user.totalXp.toLocaleString()} XP`, width - 40, yOffset + 45);
    ctx.textAlign = 'left';

    yOffset += entryHeight;
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  createRankCard,
  createLeaderboardCard
};
