const VerificationConfig = require('../models/VerificationConfig');
const { createCanvas } = require('@napi-rs/canvas');

// In-memory store for pending verifications
// Key: userId, Value: { answer: string, expires: number }
const pendingVerifications = new Map();

async function getVerificationConfig(guildId) {
  let config = await VerificationConfig.findOne({ guildId });
  if (!config) {
    config = new VerificationConfig({ guildId });
    await config.save();
  }
  return config;
}

async function updateVerificationConfig(guildId, updates) {
  const config = await getVerificationConfig(guildId);
  Object.assign(config, updates);
  await config.save();
  return config;
}

function generateMathEquation() {
  const operators = ['+', '-', '*'];
  const op = operators[Math.floor(Math.random() * operators.length)];
  let num1, num2, answer;

  if (op === '*') {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    answer = num1 * num2;
  } else if (op === '+') {
    num1 = Math.floor(Math.random() * 50) + 1;
    num2 = Math.floor(Math.random() * 50) + 1;
    answer = num1 + num2;
  } else {
    num1 = Math.floor(Math.random() * 50) + 20;
    num2 = Math.floor(Math.random() * 20) + 1;
    answer = num1 - num2;
  }

  return {
    equation: `${num1} ${op} ${num2}`,
    answer: answer.toString()
  };
}

function randomText(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateImageCaptcha() {
  const text = randomText(6);
  const width = 300;
  const height = 100;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2F3136';
  ctx.fillRect(0, 0, width, height);

  // Add noise
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add lines
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.8)`;
    ctx.lineWidth = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  // Draw text
  ctx.font = 'bold 45px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    ctx.translate(40 + i * 40, 50);
    ctx.rotate((Math.random() - 0.5) * 0.5); // Random rotation
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  return {
    buffer: canvas.toBuffer('image/png'),
    answer: text
  };
}

function setPendingVerification(userId, answer) {
  pendingVerifications.set(userId, {
    answer: answer.toLowerCase(),
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
}

function checkPendingVerification(userId, providedAnswer) {
  const pending = pendingVerifications.get(userId);
  if (!pending) return { valid: false, reason: 'No pending verification found or it expired.' };
  
  if (Date.now() > pending.expires) {
    pendingVerifications.delete(userId);
    return { valid: false, reason: 'Verification expired. Please try again.' };
  }

  if (pending.answer !== providedAnswer.toLowerCase().trim()) {
    return { valid: false, reason: 'Incorrect answer.' };
  }

  pendingVerifications.delete(userId);
  return { valid: true };
}

module.exports = {
  getVerificationConfig,
  updateVerificationConfig,
  generateMathEquation,
  generateImageCaptcha,
  setPendingVerification,
  checkPendingVerification
};
