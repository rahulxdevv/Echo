const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 24;
const store = new Map();

function keyFor(guildId, channelId) {
  if (!guildId || !channelId) return null;
  return `${guildId}:${channelId}`;
}

function timeAgo(ts, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function prune(key, now = Date.now()) {
  const entries = store.get(key);
  if (!entries || entries.length === 0) return [];
  const fresh = entries.filter(e => now - e.timestamp <= TTL_MS);
  const trimmed = fresh.slice(-MAX_ENTRIES);
  if (trimmed.length === 0) store.delete(key);
  else store.set(key, trimmed);
  return trimmed;
}

function getHistory(guildId, channelId) {
  const key = keyFor(guildId, channelId);
  if (!key) return [];
  return [...prune(key)];
}

function addTurn(guildId, channelId, { userId, username, userContent, assistantContent, now = Date.now() } = {}) {
  const key = keyFor(guildId, channelId);
  if (!key) return;
  const entries = prune(key, now);
  const name = (username || userId || 'User').toString().slice(0, 32);
  if (userContent) {
    entries.push({
      role: 'user',
      userId: userId || null,
      username: name,
      content: String(userContent).slice(0, 2000),
      timestamp: now,
    });
  }
  if (assistantContent) {
    entries.push({
      role: 'assistant',
      userId: null,
      username: 'Echo',
      content: String(assistantContent).slice(0, 2000),
      timestamp: now,
    });
  }
  store.set(key, entries.slice(-MAX_ENTRIES));
}

function clearHistory(guildId, channelId) {
  const key = keyFor(guildId, channelId);
  if (key) store.delete(key);
}

function formatHistoryAsText(history, now = Date.now()) {
  if (!history || history.length === 0) return '';
  const lines = history.map(e => `- [${e.username}, ${timeAgo(e.timestamp, now)}] ${e.content}`);
  return `Conversation so far (newest last):\n${lines.join('\n')}\n`;
}

function formatHistoryAsMessages(history, now = Date.now()) {
  if (!history || history.length === 0) return [];
  return history.map(e => ({
    role: e.role === 'assistant' ? 'assistant' : 'user',
    content: `[${e.username}, ${timeAgo(e.timestamp, now)}] ${e.content}`,
  }));
}

module.exports = {
  TTL_MS,
  MAX_ENTRIES,
  getHistory,
  addTurn,
  clearHistory,
  formatHistoryAsText,
  formatHistoryAsMessages,
};
