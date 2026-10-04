const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Helper to fit and wrap text within a specific width
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        // We are on the last line, maybe we need to truncate
        break;
      }
    }
  }
  
  if (lines.length < maxLines) {
    lines.push(currentLine);
  } else {
    // If we stopped early, add ellipsis to the last line
    let remainingText = words.slice(lines.join(' ').split(' ').length).join(' ');
    if (remainingText) {
       lines[lines.length - 1] += '...';
    }
  }
  
  return lines;
}

function drawCroppedCircleImage(ctx, image, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Creates a premium suggestion card with a progress bar.
 * @param {Object} data 
 * @param {string} data.username
 * @param {string} data.avatarUrl
 * @param {string} data.suggestionText
 * @param {string} data.suggestionId
 * @param {number} data.upvotes
 * @param {number} data.downvotes
 * @param {string} data.status - 'pending', 'approved', 'rejected'
 * @returns {Promise<Buffer>}
 */
async function createSuggestionCard(data) {
  const { username, avatarUrl, suggestionText, suggestionId, upvotes, downvotes, status } = data;
  
  const width = 800;
  const height = 400;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E2124'); // Discord dark gray
  gradient.addColorStop(1, '#282B30'); // Slightly lighter gray
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add some glassmorphism/glow effect in the background
  const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
  glow.addColorStop(0, 'rgba(88, 101, 242, 0.1)'); // Discord Blurple
  glow.addColorStop(1, 'rgba(30, 33, 36, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Status Badge
  const statusColors = {
    pending: '#FEE75C',
    approved: '#57F287',
    rejected: '#ED4245'
  };
  const statusColor = statusColors[status] || statusColors.pending;
  
  ctx.fillStyle = statusColor;
  drawRoundedRect(ctx, width - 150, 30, 120, 35, 10);
  ctx.fill();
  
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(status.toUpperCase(), width - 90, 48);

  // User info
  try {
    const avatar = await loadImage(avatarUrl);
    drawCroppedCircleImage(ctx, avatar, 40, 40, 80);
  } catch (err) {
    console.error('Failed to load avatar for suggestion card:', err);
    ctx.fillStyle = '#36393F';
    ctx.beginPath();
    ctx.arc(80, 80, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Username
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(username, 140, 75);
  
  // Suggestion ID
  ctx.fillStyle = '#B9BBBE';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText(`Suggestion #${suggestionId}`, 140, 105);

  // Suggestion Text Box
  ctx.fillStyle = 'rgba(47, 49, 54, 0.6)';
  drawRoundedRect(ctx, 40, 150, width - 80, 140, 15);
  ctx.fill();

  ctx.fillStyle = '#DCDDDE';
  ctx.font = '22px Arial, sans-serif';
  ctx.textBaseline = 'top';
  
  const lines = wrapText(ctx, suggestionText, width - 120, 4);
  lines.forEach((line, i) => {
    ctx.fillText(line, 60, 170 + (i * 30));
  });

  // Progress Bar for Voting
  const totalVotes = upvotes + downvotes;
  let upPercentage = 0.5;
  if (totalVotes > 0) {
    upPercentage = upvotes / totalVotes;
  }
  
  const barX = 40;
  const barY = 330;
  const barWidth = width - 80;
  const barHeight = 20;
  
  // Progress bar background (Downvotes area - Redish)
  ctx.fillStyle = '#ED4245'; 
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.fill();
  
  // Progress bar fill (Upvotes area - Greenish)
  if (upPercentage > 0) {
    ctx.save();
    // Create a clipping path for the upvotes side to keep it rounded
    drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 10);
    ctx.clip();
    
    ctx.fillStyle = '#57F287';
    ctx.fillRect(barX, barY, barWidth * upPercentage, barHeight);
    ctx.restore();
  }

  // Vote Counts Text
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  
  // Upvotes text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#57F287';
  ctx.fillText(`👍 ${upvotes} Upvotes`, barX, barY - 15);
  
  // Downvotes text
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ED4245';
  ctx.fillText(`${downvotes} Downvotes 👎`, barX + barWidth, barY - 15);

  return canvas.toBuffer('image/png');
}

module.exports = { createSuggestionCard };
