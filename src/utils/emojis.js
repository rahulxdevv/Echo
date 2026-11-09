function createSafeEmojiProxy(target) {
  const emptyTarget = {
    [Symbol.toPrimitive]() { return ''; },
    toString() { return ''; },
    valueOf() { return ''; },
  };
  const emptyHandler = {
    get(obj, prop) {
      if (typeof prop === 'symbol' || prop === 'inspect' || prop === 'toJSON') {
        return obj[prop];
      }
      return new Proxy(emptyTarget, emptyHandler);
    },
  };

  const handler = {
    get(obj, prop, receiver) {
      if (typeof prop === 'symbol' || prop === 'inspect' || prop === 'toJSON') {
        return Reflect.get(obj, prop, receiver);
      }
      if (prop in obj) {
        const val = obj[prop];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return new Proxy(val, {
            get(subObj, subProp, subReceiver) {
              if (typeof subProp === 'symbol' || subProp === 'inspect' || subProp === 'toJSON') {
                return Reflect.get(subObj, subProp, subReceiver);
              }
              if (subProp in subObj) {
                return subObj[subProp];
              }
              return '';
            },
          });
        }
        return val;
      }
      // Top-level property not found: check categories alias (e.g. emojis.giveaway -> emojis.categories.giveaway)
      if (obj.categories && prop in obj.categories) {
        return obj.categories[prop];
      }
      // Return an empty object proxy for unknown top-level categories so chained access doesn't throw and string coercion is ''
      return new Proxy(emptyTarget, emptyHandler);
    },
  };
  return new Proxy(target, handler);
}

const rawEmojis = {
  // Category Emojis
  categories: {
    setup: '⚙️',
    utility: '🔧',
    info: 'ℹ️',
    moderation: '🛡️',
    fun: '🎈',
    games: '🎲',
    social: '💬',
    image: '🖼️',
    economy: '💰',
    music: '🎵',
    levelling: '⭐',
    invites: '📨',
    messages: '📝',
    giveaway: '🎉',
    automod: '🤖',
    tools: '🛠️',
    tickets: '🎫',
    welcome: '👋',
    premium: '👑',
    modmail: '📬',
    notifier: '🔔',
    reactionrole: '🎭',
    'reaction role': '🎭',
    suggestion: '💡',
    verification: '✅',
    join2create: '🔊',
  },

  // Category shortcut aliases
  giveaway: '🎉',

  // Status & Icons
  status: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    loading: '⏳',
    info: 'ℹ️',
    search: '🔍',
    deleted: '🗑️',
    ghost: '👻',
    vanished: '🌀',
    unreachable: '📵',
    spirit: '🧘',
    no_disturb: '🚫',
    welcome_back: '👋',
    fire: '🔥',
    shadow: '👁️',
    respawn: '🕹️',
    void: '🌌',
    shout: '🌀',
    check: '✅',
    cross: '❌',
    wait: '⏳',
    sleep: '💤',
    walker: '🚶',
    clock: '⏰',
    time: '🕒',
    ping: '🏓',
    celebration: '🎉',
    neutral: '😐',
  },

  // Common & UI
  common: {
    bullet: '•',
    dot: '🔹',
    arrow: '➡️',
    arrow_right: '➡️',
    back: '⬅️',
    first: '⏪',
    last: '⏩',
    home: '🏠',
    global: '🌐',
    link: '🔗',
    external: '🔗',
    gear: '⚙️',
    wrench: '🔧',
    shield: '🛡️',
    clock: '⏰',
    calendar: '📅',
    user: '👤',
    users: '👥',
    channel: '📢',
    category: '📂',
    id: '🆔',
    tag: '🏷️',
    reason: '📝',
    timestamp: '🕒',
    crown: '👑',
    level: '⭐',
    xp: '✨',
    gift: '🎁',
    coins: '💰',
    money_bag: '💰',
    bank: '🏦',
    wallet: '👛',
    shop: '🛒',
    inventory: '🎒',
    box: '📦',
    lock: '🔒',
    unlock: '🔓',
    mute: '🔇',
    unmute: '🔊',
    warn: '⚠️',
    ban: '🔨',
    kick: '👞',
    slowmode: '🐌',
    ticket: '🎫',
    suggestion: '💡',
    announcement: '📢',
    ping: '🏓',
    calculator: '🧮',
    dice: '🎲',
    one: '1️⃣',
    two: '2️⃣',
    three: '3️⃣',
    four: '4️⃣',
    five: '5️⃣',
    six: '6️⃣',
    seven: '7️⃣',
    eight: '8️⃣',
    nine: '9️⃣',
    cross: '❌',
    circle: '⭕',
    plus: '➕',
    minus: '➖',
    celebration: '🎉',
    fire: '🔥',
    neutral: '😐',
  },

  // Social Interactions
  social: {
    hug: '🤗',
    kiss: '💋',
    slap: '👋',
    poke: '👉',
    pat: '🖐️',
    wave: '👋',
    highfive: '✋',
    laugh: '😂',
    cry: '😢',
    dance: '💃',
    heart: '❤️',
    black_heart: '🖤',
    two_hearts: '💕',
    revolving_hearts: '💞',
    sparkling_heart: '💖',
    broken_heart: '💔',
    heart_pulse: '💘',
    angry: '💢',
    boy_dance: '🕺',
    sparkles: '✨',
    cat_face: '😺',
    kissing_face: '😘',
    laughing: '😆',
    celebrate: '🙌',
    love_letter: '💌',
  },

  // Moderation
  mod: {
    ban: '🔨',
    kick: '👢',
    mute: '🔇',
    unmute: '🔊',
    warn: '⚠️',
    purge: '🧹',
    lock: '🔒',
    unlock: '🔓',
    slowmode: '⏳',
    shield: '🛡️',
  },

  // Info & Stats
  info: {
    role: '🎭',
    members: '👥',
    id: '🆔',
    name: '🏷️',
    calendar: '📅',
    list: '📋',
    pin: '📍',
    server: '🏢',
    channel: '📁',
    boost: '🚀',
    owner: '👑',
    bot: '🤖',
  },

  // Honeypot
  honeypot: '🍯',
  trap: '🪤',
  // Economy
  economy: {
    money: '💰',
    bank: '🏦',
    wallet: '👛',
    coins: '🪙',
    slots: '🎰',
    shop: '🏪',
    inventory: '🎒',
    rob: '🥷',
    police: '🚨',
    trophy: '🏆',
    medal_1: '🥇',
    medal_2: '🥈',
    medal_3: '🥉',
    ticket: '🎫',
    claim: '✋',
    unclaim: '↩️',
    transcript: '📄',
    work: '💼',
    daily: '🎁',
    deposit: '📥',
    withdraw: '📤',
    transfer: '💸',
    received: '📩',
    gamble: '🎲',
    win: '🎉',
    lose: '😔',
    fine: '🚨',
    streak: '🔥',
    clock: '⏰',
    date: '📅',
  },

  // Items & Food
  items: {
    pizza: '🍕',
    burger: '🍔',
    taco: '🌮',
    ice_cream: '🍦',
    cake: '🍰',
    wine: '🍷',
    diamond: '💎',
    game_console: '🎮',
    smartphone: '📱',
    box: '📦',
  },

  // Fun & Games
  fun: {
    eight_ball: '🎱',
    coin: '🪙',
    slots: '🎰',
    dice: '🎲',
    thinking: '🤔',
    crystal_ball: '🔮',
    target: '🎯',
    telescope: '🔭',
    cherry: '🍒',
    lemon: '🍋',
    grape: '🍇',
    watermelon: '🍉',
    star: '⭐',
    diamond: '💎',
    bell: '🔔',
    trophy: '🏆',
    skull: '💀',
    reverse: '🔄',
    dumb: '🧠',
    rock: '🪨',
    paper: '📄',
    scissors: '✂️',
    tie: '🤝',
    jackpot: '🎉',
    shiny: '✨',
  },

  // Image & Media
  media: {
    image: '🖼️',
    gallery: '📸',
    video: '🎥',
    music: '🎶',
    camera: '📸',
    paint: '🎨',
    emoji: '😀',
    clap: '👏',
    bubble: '⭕',
    flower: '🌸',
    clown: '🤡',
    sparkle: '✨',
    explosion: '💥',
    wolf: '🐺',
    stars: '🌟',
    happy: '😄',
  },

  // Animals
  animals: {
    dog: '🐶',
    cat: '🐱',
    fox: '🦊',
    duck: '🦆',
    bird: '🐦',
    shiba: '🐕',
    rabbit: '🐰',
    panda: '🐼',
    koala: '🐨',
    tiger: '🐯',
    lion: '🦁',
    cow: '🐮',
    pig: '🐷',
    frog: '🐸',
    monkey: '🐵',
    chicken: '🐔',
    penguin: '🐧',
  },
};

// Prefer custom emojis (from ./emoji) over Unicode everywhere the names match.
// Unicode fallbacks live in FALLBACK_EMOJIS (see ./emoji) for guilds/contexts
// where the custom ID is not available.
let CUSTOM = {};
try {
  ({ CUSTOM_EMOJIS: CUSTOM } = require('./emoji'));
} catch {
  CUSTOM = {};
}

const CUSTOM_ALIASES = {
  // Categories that do not share the custom name directly.
  setup: 'developer',
  utility: 'slash',
  fun: 'particles',
  social: 'chats',
  image: 'draw',
  economy: 'bitcoin',
  messages: 'mail',
  tools: 'light',
  premium: 'emerald',
  levelling: 'rocket',
  invites: 'link',
  welcome: 'newbie',
  verification: 'verified',
  tickets: 'ticket',
  notifier: 'notify',
  modmail: 'mail',
  join2create: 'undeafen',
  reactionrole: 'emoji',
  'reaction role': 'emoji',
  suggestion: 'light',
  // UI / common aliases
  games: 'game',
  moderation: 'mod',
  arrow: 'right',
  arrow_right: 'right',
  back: 'left',
  celebration: 'giveaway',
  crown: 'owner',
  shield: 'defence',
  daily: 'gift',
  streak: 'fire',
  success: 'tick',
  check: 'tick',
};

function applyCustomEmojis(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      applyCustomEmojis(value);
    } else if (typeof value === 'string') {
      const customKey = CUSTOM_ALIASES[key] || key;
      if (CUSTOM[customKey]) {
        obj[key] = CUSTOM[customKey];
      } else if (CUSTOM[key]) {
        obj[key] = CUSTOM[key];
      }
    }
  }
}

applyCustomEmojis(rawEmojis);

/**
 * Return the normal Unicode fallback for a custom key (see ./emoji).
 * Use when the guild cannot render the custom ID.
 */
function getUnicodeFallback(key) {
  try {
    const { FALLBACK_EMOJIS, getFallbackEmoji } = require('./emoji');
    if (getFallbackEmoji) {
      const v = getFallbackEmoji(key);
      if (v) return v;
    }
    if (FALLBACK_EMOJIS && FALLBACK_EMOJIS[key]) return FALLBACK_EMOJIS[key];
  } catch {}
  // Safe defaults for navigation.
  const NAV = { left: '⬅️', right: '➡️', up: '⬆️', down: '⬇️', home: '🏠', back: '⬅️', next: '➡️', arrow: '➡️', arrow_right: '➡️' };
  return NAV[key] || '';
}

const proxied = createSafeEmojiProxy(rawEmojis);

// Attach fallback helper without changing the proxy's normal behaviour.
proxied.getUnicodeFallback = getUnicodeFallback;

module.exports = proxied;
