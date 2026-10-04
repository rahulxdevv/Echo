const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function generateHelpImage(client) {
  const canvas = createCanvas(800, 200);
  const ctx = canvas.getContext('2d');

  // Load bot avatar first so we can use it for the background
  const avatarUrl = client.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
  let avatar;
  try {
    avatar = await loadImage(avatarUrl);
  } catch (e) {
    avatar = null;
  }

  // Background pill clip
  ctx.beginPath();
  ctx.roundRect(0, 0, 800, 200, 40);
  ctx.clip(); // Ensure everything stays inside the pill

  if (avatar) {
    // Draw blurred avatar background
    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.drawImage(avatar, -100, -300, 1000, 1000); // Stretch and blur
    ctx.restore();
    
    // Add dark overlay to ensure text is readable
    ctx.fillStyle = 'rgba(17, 18, 22, 0.75)';
    ctx.fillRect(0, 0, 800, 200);
  } else {
    // Fallback Background pill
    ctx.fillStyle = '#111216';
    ctx.fillRect(0, 0, 800, 200);
  }

  // Draw a faded graphic on the right
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  ctx.translate(680, 100);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-60, -60, 120, 120);
  ctx.fillRect(-100, -20, 40, 40);
  ctx.fillRect(60, -20, 40, 40);
  ctx.fillRect(-20, -100, 40, 40);
  ctx.fillRect(-20, 60, 40, 40);
  ctx.restore();

  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(20, 20, 160, 160, 30);
    ctx.clip();
    ctx.drawImage(avatar, 20, 20, 160, 160);
    ctx.restore();
  } else {
    ctx.fillStyle = '#2b2d31';
    ctx.beginPath();
    ctx.roundRect(20, 20, 160, 160, 30);
    ctx.fill();
  }

  // Text: Bot Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 55px sans-serif';
  ctx.fillText(client.user.username, 210, 95);

  // Text: Stats
  ctx.fillStyle = '#a1a5ac';
  ctx.font = '30px sans-serif';
  
  const serverCount = client.guilds.cache.size.toLocaleString();
  const memberCount = client.guilds.cache.reduce((a, b) => a + (b.memberCount || 0), 0).toLocaleString();
  
  const str1 = 'Serving ';
  const str2 = ` servers and `;
  const str3 = ` users`;

  ctx.fillText(str1, 210, 150);
  
  let currentX = 210 + ctx.measureText(str1).width;
  ctx.fillStyle = '#f2613f'; // A nice orange accent like in the example
  ctx.fillText(serverCount, currentX, 150);
  
  currentX += ctx.measureText(serverCount).width;
  ctx.fillStyle = '#a1a5ac';
  ctx.fillText(str2, currentX, 150);
  
  currentX += ctx.measureText(str2).width;
  ctx.fillStyle = '#f2613f';
  ctx.fillText(memberCount, currentX, 150);
  
  currentX += ctx.measureText(memberCount).width;
  ctx.fillStyle = '#a1a5ac';
  ctx.fillText(str3, currentX, 150);

  return canvas.toBuffer('image/png');
}

module.exports = { generateHelpImage };
