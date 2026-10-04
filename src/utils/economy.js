const User = require('../models/User');
const emojis = require('./emojis');

const SHOP_ITEMS = [
  { id: 'pizza', name: 'Pizza', emoji: emojis.items.pizza, price: 50 },
  { id: 'burger', name: 'Burger', emoji: emojis.items.burger, price: 40 },
  { id: 'taco', name: 'Taco', emoji: emojis.items.taco, price: 30 },
  { id: 'ice_cream', name: 'Ice Cream', emoji: emojis.items.ice_cream, price: 35 },
  { id: 'cake', name: 'Cake', emoji: emojis.items.cake, price: 80 },
  { id: 'wine', name: 'Wine', emoji: emojis.items.wine, price: 150 },
  { id: 'diamond', name: 'Diamond', emoji: emojis.items.diamond, price: 5000 },
  { id: 'trophy', name: 'Trophy', emoji: emojis.economy.trophy, price: 3000 },
  { id: 'game_console', name: 'Game Console', emoji: emojis.items.game_console, price: 800 },
  { id: 'smartphone', name: 'Smartphone', emoji: emojis.items.smartphone, price: 1200 },
];

function getShopItems() {
  return SHOP_ITEMS.map((item) => ({ ...item }));
}

function getShopItemMap() {
  return Object.fromEntries(
    SHOP_ITEMS.map((item) => [
      item.id,
      {
        ...item,
        displayName: `${item.emoji} ${item.name}`,
      },
    ]),
  );
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString()}`;
}

function getNetWorth(userData) {
  return (userData?.balance || 0) + (userData?.bank || 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && !hours) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

function getCooldownRemaining(lastUsed, cooldownMs) {
  if (!lastUsed) {
    return 0;
  }

  const endsAt = new Date(lastUsed).getTime() + cooldownMs;
  return Math.max(0, endsAt - Date.now());
}

function resolveAmountInput(rawInput, availableAmount) {
  const input = String(rawInput || '').trim().toLowerCase();

  if (!input) {
    return null;
  }

  if (input === 'all') {
    return availableAmount;
  }

  if (input === 'half') {
    return Math.floor(availableAmount / 2);
  }

  const parsed = Number.parseInt(input, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

async function getOrCreateUser(user) {
  let userData = await User.findOne({ userId: user.id });

  if (!userData) {
    userData = await User.create({
      userId: user.id,
      username: user.username,
      tag: user.tag,
      balance: 0,
      bank: 0,
    });
  } else if (userData.username !== user.username || userData.tag !== user.tag) {
    userData.username = user.username;
    userData.tag = user.tag;
    await userData.save();
  }

  return userData;
}

module.exports = {
  formatCurrency,
  formatDuration,
  getCooldownRemaining,
  getNetWorth,
  getOrCreateUser,
  getShopItemMap,
  getShopItems,
  resolveAmountInput,
};


