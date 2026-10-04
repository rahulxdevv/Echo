const CUSTOM_EMOJI_RE = /^<a?:[A-Za-z0-9_]{2,32}:\d{17,20}>$/;
const KEYCAP_EMOJI_RE = /^[0-9#*]\uFE0F?\u20E3$/u;
const REGIONAL_INDICATOR_PAIR_RE = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
const PICTOGRAPHIC_EMOJI_RE = /\p{Extended_Pictographic}/u;

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

module.exports = {
  isDiscordEmoji,
  normalizeDiscordEmoji,
  setButtonEmoji
};
