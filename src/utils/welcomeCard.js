const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const DEFAULT_BACKGROUND_PATH = path.join(__dirname, '..', '..', 'public', 'wallpaper.png');

function drawCoverImage(ctx, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;

  ctx.filter = 'none';
  ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
}

function drawCroppedCircleImage(ctx, image, x, y, size) {
  const scale = Math.max(size / image.width, size / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const dx = x + (size - scaledWidth) / 2;
  const dy = y + (size - scaledHeight) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, dx, dy, scaledWidth, scaledHeight);
  ctx.restore();
}

function fitText(ctx, text, maxWidth, fontFactory, startSize, minSize) {
  let size = startSize;

  while (size > minSize) {
    ctx.font = fontFactory(size);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }

  return size;
}

function drawFittedText(ctx, text, x, y, maxWidth, fontFactory, startSize, minSize) {
  fitText(ctx, text, maxWidth, fontFactory, startSize, minSize);
  ctx.fillText(text, x, y);
}

async function loadBackgroundImage(backgroundUrl) {
  if (backgroundUrl) {
    try {
      if (backgroundUrl.startsWith('http://') || backgroundUrl.startsWith('https://')) {
        const response = await axios.get(backgroundUrl, {
          responseType: 'arraybuffer',
          timeout: 10000
        });

        return loadImage(Buffer.from(response.data));
      }

      const possiblePaths = [
        path.resolve(backgroundUrl),
        path.join(process.cwd(), backgroundUrl),
        path.join(__dirname, '..', '..', backgroundUrl)
      ];

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          return loadImage(fs.readFileSync(testPath));
        }
      }
    } catch (error) {
      console.warn('Failed to load configured background, using wallpaper.png:', error.message);
    }
  }

  if (fs.existsSync(DEFAULT_BACKGROUND_PATH)) {
    return loadImage(fs.readFileSync(DEFAULT_BACKGROUND_PATH));
  }

  return null;
}

/**
 * Create a welcome card image.
 * @param {Object} options - Card options
 * @param {string} options.username - Username to display
 * @param {string} options.avatarUrl - Avatar URL
 * @param {string} options.message - Welcome message
 * @param {string} options.backgroundUrl - Background image URL (optional)
 * @param {number} options.avatarSize - Avatar size in pixels (default: 180)
 * @param {number} options.avatarX - Avatar X position (null = centered)
 * @param {number} options.avatarY - Avatar Y position (default: 45)
 * @param {string} options.usernameColor - Username color (default: '#00f0b5')
 * @param {number} options.usernameSize - Username font size (default: 60)
 * @param {number} options.usernameY - Username Y position (default: 257)
 * @param {string} options.welcomeTextColor - Welcome text color (default: '#f2f4f5')
 * @param {number} options.welcomeTextSize - Welcome text font size (default: 48)
 * @param {number} options.welcomeTextY - Welcome text Y position (default: 300)
 * @param {string} options.messageColor - Message color (default: 'rgba(235, 238, 241, 0.62)')
 * @param {number} options.messageSize - Message font size (default: 25)
 * @param {number} options.messageY - Message Y position (default: 397)
 * @param {number} options.backgroundBlur - Background blur amount (default: 3)
 * @param {number} options.overlayDarkness - Overlay darkness 0-1 (default: 0.5)
 * @param {number} options.bottomGradientHeight - Bottom gradient height (default: 80)
 * @param {number} options.bottomGradientOpacity - Bottom gradient opacity (default: 0.4)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function createWelcomeCard(options) {
  const {
    username,
    avatarUrl,
    message,
    backgroundUrl,
    avatarSize = 180,
    avatarX = null,
    avatarY = 45,
    usernameColor = '#00f0b5',
    usernameSize = 60,
    usernameY = 257,
    welcomeTextColor = '#f2f4f5',
    welcomeTextSize = 48,
    welcomeTextY = 300,
    messageColor = 'rgba(235, 238, 241, 0.62)',
    messageSize = 25,
    messageY = 397,
    backgroundBlur = 3,
    overlayDarkness = 0.5,
    bottomGradientHeight = 80,
    bottomGradientOpacity = 0.4
  } = options;

  const width = 837;
  const height = 456;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bgImage = await loadBackgroundImage(backgroundUrl);
  if (bgImage) {
    ctx.filter = `blur(${backgroundBlur}px)`;
    drawCoverImage(ctx, bgImage, width, height);
    ctx.filter = 'none';
  }

  if (!bgImage) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2d9fd6');
    gradient.addColorStop(0.48, '#3f8f65');
    gradient.addColorStop(1, '#07100f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, 'rgba(0, 0, 0, 0)');
  wash.addColorStop(0.45, `rgba(0, 0, 0, ${0.08 * overlayDarkness})`);
  wash.addColorStop(0.76, `rgba(0, 0, 0, ${0.28 * overlayDarkness})`);
  wash.addColorStop(1, `rgba(0, 0, 0, ${0.68 * overlayDarkness})`);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  const centerShade = ctx.createRadialGradient(width / 2, 214, 60, width / 2, 214, 340);
  centerShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  centerShade.addColorStop(1, `rgba(0, 0, 0, ${0.14 * overlayDarkness})`);
  ctx.fillStyle = centerShade;
  ctx.fillRect(0, 0, width, height);

  // Draw texts first
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const displayName = String(username || '').toUpperCase();
  ctx.fillStyle = usernameColor;
  drawFittedText(
    ctx,
    displayName,
    width / 2,
    usernameY,
    width - 120,
    size => `900 ${size}px Arial Black, Arial, sans-serif`,
    usernameSize,
    34
  );

  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = welcomeTextColor;
  drawFittedText(
    ctx,
    'WELCOME',
    width / 2,
    welcomeTextY,
    width - 200,
    size => `900 ${size}px Arial Black, Arial, sans-serif`,
    welcomeTextSize,
    32
  );

  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = messageColor;
  drawFittedText(
    ctx,
    String(message || '').toUpperCase(),
    width / 2,
    messageY,
    width - 160,
    size => `300 ${size}px Arial, sans-serif`,
    messageSize,
    16
  );

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowOffsetX = 0;

  // Draw avatar on top of texts
  try {
    const avatar = await loadImage(avatarUrl);
    const finalAvatarX = avatarX !== null ? avatarX : (width / 2 - avatarSize / 2);
    const avatarCenterX = finalAvatarX + avatarSize / 2;
    const avatarCenterY = avatarY + avatarSize / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 19;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
    ctx.restore();

    drawCroppedCircleImage(ctx, avatar, finalAvatarX, avatarY, avatarSize);
  } catch (error) {
    console.error('Failed to load avatar:', error);
  }

  // Add bottom gradient
  const bottomGradient = ctx.createLinearGradient(0, height - bottomGradientHeight, 0, height);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(1, `rgba(0, 0, 0, ${bottomGradientOpacity})`);
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, height - bottomGradientHeight, width, bottomGradientHeight);

  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard };
