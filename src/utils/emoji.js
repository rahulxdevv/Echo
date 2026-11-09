/**
 * Emoji helpers for Echo.
 *
 * Shared model:
 *   1. CUSTOM_EMOJIS - preferred Discord custom emojis keyed by canonical name.
 *                         Use these when the bot can render them.
 *   2. FALLBACK_EMOJIS - normal Unicode emoji per key. Always safe everywhere.
 *   3. resolveEmoji(key, fallback?) resolves `key` through the custom map first,
 *      then the Unicode fallback, then the caller-supplied fallback.
 *
 * Lookups are forgiving: `:gift:`, `gift`, `Gift`, `gift~3`, `:gift~3:` all work.
 * Raw variants (`gift~3`, `gift~4`, `18~2`, `18~3` …) are remembered in
 * CUSTOM_EMOJI_VARIANTS so specific uploads keep their own IDs.
 */

const CUSTOM_EMOJI_RE = /^<a?:[A-Za-z0-9_]{2,32}:\d{17,20}>$/;
const CUSTOM_EMOJI_PARTS_RE = /^<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>$/;
const KEYCAP_EMOJI_RE = /^[0-9#*]\uFE0F?\u20E3$/u;
const REGIONAL_INDICATOR_PAIR_RE = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
const PICTOGRAPHIC_EMOJI_RE = /\p{Extended_Pictographic}/u;

// ------------------------------------------------------------------
// Custom emoji pack (Discord server custom emojis)
// ------------------------------------------------------------------

const CUSTOM_EMOJI_VARIANTS = {
  // verified
  'verified~1': '<:verified:1500845595156287628>',
  // misc
  doll: '<:doll:1500845598402678916>',
  'gift~3': '<:gift:1500845601313525800>',
  'gift~4': '<:gift:1500858816756187281>',
  bitcoin: '<:bitcoin:1500845604014915584>',
  reddit: '<:reddit:1500845606560727040>',
  'youtube~1': '<:youtube:1500845608745959485>',
  'folder~1': '<:folder:1500845611316940860>',
  github: '<:github:1500845613661687850>',
  developer: '<:developer:1500845616228466828>',
  'info~3': '<:info:1500845619428855918>',
  'home~1': '<:home:1500845622100627517>',
  game: '<:game:1500845625498140683>',
  'discover~1': '<:discover:1500845628752793651>',
  world: '<:world:1500845631210524885>',
  pin: '<:pin:1500845633853063278>',
  deafen: '<:deafen:1500845636973760704>',
  undeafen: '<:undeafen:1500845640098254958>',
  'mute~2': '<:mute:1500845642438676680>',
  unmute: '<:unmute:1500845644951326740>',
  notify: '<:notify:1500845647719567360>',
  'announce~1': '<:announce:1500845650802245753>',
  'emoji~1': '<:emoji:1500845654170275881>',
  'newbie~1': '<:newbie:1500845657177718824>',
  plant: '<:plant:1500845660289765648>',
  partner: '<:partner:1500845663846404206>',
  'bot~4': '<:bot:1500845667378135162>',
  ban: '<:ban:1500845670125273169>',
  emerald: '<:emerald:1500845673506144328>',
  mod: '<:mod:1500845676257349794>',
  'automod~1': '<:automod:1500843783858946172>',
  defence: '<:defence:1500843786908074125>',
  'left~2': '<:left:1500843789730975744>',
  'up~2': '<:up:1500843793249996831>',
  'down~1': '<:down:1500843795405606922>',
  '18~2': '<:18:1500843798123773983>',
  '18~3': '<:18:1500843801059524719>',
  draw: '<:draw:1500843804595323051>',
  mention: '<:mention:1500843808559202394>',
  'trophy~1': '<:trophy:1500843811423912009>',
  'search~4': '<:search:1500843814804389992>',
  'idle~1': '<:idle:1500843817895460925>',
  'trash~3': '<:trash:1500843820382945331>',
  'rocket~2': '<:rocket:1500843823054458953>',
  giveaway: '<:giveaway:1500843825487282216>',
  particles: '<:particles:1500843827974508655>',
  'music~3': '<:music:1500843830746943498>',
  'lock~4': '<:lock:1500843834295193610>',
  'unlock~4': '<:unlock:1500843836879143152>',
  'fire~2': '<:fire:1500843839924211762>',
  owner: '<:owner:1500843842969014425>',
  sword: '<:sword:1500843845997297856>',
  'heart~3': '<:heart:1500843848560017408>',
  'timer~1': '<:timer:1500843851412275311>',
  'light~1': '<:light:1500843854843220039>',
  people: '<:people:1500843858744053880>',
  'user~4': '<:user:1500843862426652752>',
  'dislike~1': '<:dislike:1500843866205716702>',
  'like~1': '<:like:1500843869976264774>',
  'chats~1': '<:chats:1500843872593514556>',
  'mail~1': '<:mail:1500843874900512838>',
  'ticket~3': '<:ticket:1500843877547114516>',
  'link~5': '<:link:1500843881057751231>',
  'right~2': '<:right:1500843884505206834>',
  'pause~3': '<:pause:1500843888234205385>',
  'play~3': '<:play:1500843890876354580>',
  'slash~1': '<:slash:1500843893435138220>',
  block: '<:block:1500843897411211304>',
  'warn~1': '<:warn:1500843900363997214>',
  'question~2': '<:question:1500843903228579870>',
  'minus~1': '<:minus:1500843906995060836>',
  'plus~2': '<:plus:1500843910476468314>',
  'tick~3': '<:tick:1500843915794714624>',
  juice: '<:juice:1500843920685531316>',
  'bat~1': '<:bat:1500843925596803183>',
  'skull~2': '<:skull:1500843932714799214>',
  'ghost~1': '<:ghost:1500843935428251860>',
  pet: '<:pet:1500843939094331502>',
  'egg~1': '<:egg:1500843942504038420>',
};

// Canonical (base) map: strips the trailing `~N` variant number.
// Duplicate bases keep the first upload (e.g. `gift` -> `gift~3`).
function baseKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.toLowerCase().trim().replace(/\s+/g, '').replace(/~[0-9]+$/i, '');
}

const CUSTOM_EMOJIS = {};
for (const [rawKey, value] of Object.entries(CUSTOM_EMOJI_VARIANTS)) {
  const base = baseKey(rawKey);
  if (base && !(base in CUSTOM_EMOJIS)) {
    CUSTOM_EMOJIS[base] = value;
  }
}

// ------------------------------------------------------------------
// Normal Unicode fallbacks (safe everywhere, per key)
// ------------------------------------------------------------------

const FALLBACK_EMOJIS = {
  verified: '✅',
  doll: '🧸',
  gift: '🎁',
  bitcoin: '🪙',
  reddit: '🟠',
  youtube: '▶️',
  folder: '📁',
  github: '🐙',
  developer: '💻',
  info: 'ℹ️',
  home: '🏠',
  game: '🎮',
  discover: '🧭',
  world: '🌍',
  pin: '📌',
  deafen: '🔇',
  undeafen: '🔊',
  mute: '🔇',
  unmute: '🔊',
  notify: '🔔',
  announce: '📢',
  emoji: '😀',
  newbie: '👋',
  plant: '🪴',
  partner: '🤝',
  bot: '🤖',
  ban: '🔨',
  emerald: '🟢',
  mod: '🛡️',
  automod: '🤖',
  defence: '🛡️',
  left: '⬅️',
  up: '⬆️',
  down: '⬇️',
  18: '🔞',
  draw: '✏️',
  mention: '📣',
  trophy: '🏆',
  search: '🔍',
  idle: '💤',
  trash: '🗑️',
  rocket: '🚀',
  giveaway: '🎉',
  particles: '✨',
  music: '🎵',
  lock: '🔒',
  unlock: '🔓',
  fire: '🔥',
  owner: '👑',
  sword: '⚔️',
  heart: '❤️',
  timer: '⏱️',
  light: '💡',
  people: '👥',
  user: '👤',
  dislike: '👎',
  like: '👍',
  chats: '💬',
  mail: '✉️',
  ticket: '🎫',
  link: '🔗',
  right: '➡️',
  pause: '⏸️',
  play: '▶️',
  slash: '⚡',
  block: '⛔',
  warn: '⚠️',
  question: '❓',
  minus: '➖',
  plus: '➕',
  tick: '✅',
  juice: '🧃',
  bat: '🦇',
  skull: '💀',
  ghost: '👻',
  pet: '🐾',
  egg: '🥚',

  // Help-menu navigation aliases (map onto custom arrows where we have them).
  back: '⬅️',
  next: '➡️',
  first: '⏪',
  last: '⏩',
  arrow: '➡️',
  arrow_right: '➡️',
};

// ------------------------------------------------------------------
// Existing validator helpers (unchanged behaviour)
// ------------------------------------------------------------------

function getGraphemes(value) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)]
      .map(segment => segment.segment);
  }

  return [...value];
}

function isDiscordEmoji(value) {
  if (typeof value !== 'string') return false;

  const emoji = value.trim();
  if (!emoji) return false;
  if (CUSTOM_EMOJI_RE.test(emoji)) return true;

  const graphemes = getGraphemes(emoji).filter(grapheme => grapheme.trim());
  if (graphemes.length !== 1) return false;

  return PICTOGRAPHIC_EMOJI_RE.test(emoji) ||
    KEYCAP_EMOJI_RE.test(emoji) ||
    REGIONAL_INDICATOR_PAIR_RE.test(emoji);
}

function normalizeDiscordEmoji(value, fallback = null) {
  if (isDiscordEmoji(value)) return value.trim();
  if (isDiscordEmoji(fallback)) return fallback.trim();
  return null;
}

function setButtonEmoji(button, value, fallback = null) {
  const emoji = normalizeDiscordEmoji(value, fallback);
  if (emoji) button.setEmoji(emoji);
  return button;
}

// ------------------------------------------------------------------
// Custom-emoji resolution with normal-emoji fallback
// ------------------------------------------------------------------

function normalizeKey(name) {
  if (typeof name !== 'string') return null;
  let key = name.trim().toLowerCase();
  if (!key) return null;
  // Accept `:name:`, `name`, `:name~1:` etc.
  if (key.startsWith(':') && key.endsWith(':') && key.length > 2) {
    key = key.slice(1, -1);
  } else if (key.startsWith(':')) {
    key = key.slice(1);
  } else if (key.endsWith(':')) {
    key = key.slice(0, -1);
  }
  key = key.replace(/\s+/g, '');
  return key || null;
}

function getCustomEmoji(name) {
  const key = normalizeKey(name);
  if (!key) return null;
  if (CUSTOM_EMOJI_VARIANTS[key]) return CUSTOM_EMOJI_VARIANTS[key];
  const base = baseKey(key);
  if (base && CUSTOM_EMOJIS[base]) return CUSTOM_EMOJIS[base];
  // Also try lower-case variants map directly
  if (CUSTOM_EMOJIS[key]) return CUSTOM_EMOJIS[key];
  return null;
}

function getFallbackEmoji(name) {
  const key = normalizeKey(name);
  if (!key) return null;
  if (FALLBACK_EMOJIS[key]) return FALLBACK_EMOJIS[key];
  const base = baseKey(key);
  if (base && FALLBACK_EMOJIS[base]) return FALLBACK_EMOJIS[base];
  return null;
}

function hasCustomEmoji(name) {
  return Boolean(getCustomEmoji(name));
}

function getCustomEmojiId(name) {
  const custom = getCustomEmoji(name);
  if (!custom) return null;
  const match = custom.match(CUSTOM_EMOJI_PARTS_RE);
  return match ? match[3] : null;
}

/**
 * Resolve `name` to an emoji string.
 * Preference: custom emoji -> FALLBACK_EMOJIS -> caller `fallback`.
 */
function resolveEmoji(name, fallback = null) {
  const custom = getCustomEmoji(name);
  if (custom) return custom;
  const unicode = getFallbackEmoji(name);
  if (unicode) return unicode;
  if (fallback && isDiscordEmoji(fallback)) return String(fallback).trim();
  // If caller passed a raw fallback string that is not strictly a single
  // emoji (e.g. '➡️' already validates, but keep lenient for plain text),
  // only return it when it validates.
  return null;
}

/**
 * Like `resolveEmoji`, but drops the custom emoji when the guild cannot
 * render it (emoji not in that guild's cache). Falls back to Unicode.
 *
 * @param {string} name
 * @param {{ emojis?: { cache?: Map<string, unknown> | any } } | null} guild
 * @param {string|null} fallback
 */
function resolveEmojiForGuild(name, guild = null, fallback = null) {
  const custom = getCustomEmoji(name);
  if (!custom) {
    return getFallbackEmoji(name) || resolveEmoji(name, fallback);
  }
  const id = getCustomEmojiId(name);
  const cache = guild?.emojis?.cache;
  // If we have a guild cache and the ID is missing there, use the Unicode fallback.
  if (id && cache && typeof cache.has === 'function' && !cache.has(id)) {
    return getFallbackEmoji(name) || fallback || null;
  }
  // No guild context to check against: prefer the custom emoji.
  return custom;
}

/** Short alias - use as `e('right')` / `e('verified')`. */
function e(name, fallback = null) {
  return resolveEmoji(name, fallback);
}

// For the help menu navigation buttons (custom arrows with Unicode fallback).
function getArrowLeft() {
  return resolveEmoji('left', '⬅️');
}

function getArrowRight() {
  return resolveEmoji('right', '➡️');
}

function getArrowUp() {
  return resolveEmoji('up', '⬆️');
}

function getArrowDown() {
  return resolveEmoji('down', '⬇️');
}

module.exports = {
  // Validator helpers (backward compatible)
  isDiscordEmoji,
  normalizeDiscordEmoji,
  setButtonEmoji,

  // Custom emoji pack
  CUSTOM_EMOJIS,
  CUSTOM_EMOJI_VARIANTS,
  FALLBACK_EMOJIS,

  // Resolution helpers (custom first, Unicode fallback)
  getCustomEmoji,
  getFallbackEmoji,
  hasCustomEmoji,
  getCustomEmojiId,
  resolveEmoji,
  resolveEmojiForGuild,
  e,
  emoji: e,
  getArrowLeft,
  getArrowRight,
  getArrowUp,
  getArrowDown,
};
