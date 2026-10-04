const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

// ─── AFK store (in-memory, keyed by userId) ───────────────────────────────────
// Structure: { reason, timestamp, scope: 'guild' | 'global', guildId }
// Exported so messageCreate.js can access it
if (!global._afkStore) global._afkStore = new Map();
const afkStore = global._afkStore;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function isAfk(userId, guildId) {
  const entry = afkStore.get(userId);
  if (!entry) return null;
  if (entry.scope === 'global') return entry;
  if (entry.scope === 'guild' && entry.guildId === guildId) return entry;
  return null;
}

// ─── Payload builders ─────────────────────────────────────────────────────────

const SET_MESSAGES = [
  `Gone ghost mode ${emojis.status.ghost}`,
  `Vanished into the void ${emojis.status.vanished}`,
  `Currently unreachable, try again never ${emojis.status.unreachable}`,
  `Left the chat, Spiritually. ${emojis.status.spirit}`,
  `Do not disturb. Seriously. ${emojis.status.no_disturb}`,
];

const BACK_MESSAGES = [
  `The legend has returned! ${emojis.status.fire}`,
  `Back from the shadow realm ${emojis.status.shadow}`,
  `They're alive! (allegedly) ${emojis.fun.skull}`,
  `Respawned and ready ${emojis.status.respawn}`,
  `The void released them ${emojis.status.void}`,
];

const PING_MESSAGES = [
  `Bruh they're not here ${emojis.fun.skull}`,
  `You just pinged a ghost ${emojis.status.ghost}`,
  `They dipped, fam ${emojis.status.walker}`,
  `Wrong person, they're AFK ${emojis.status.unreachable}`,
  `You're shouting into the void ${emojis.status.shout}`,
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildSetPayload(username, reason, scope) {
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const scopeTag = scope === 'global' ? `${emojis.common.global} Global AFK` : `${emojis.common.home} Server AFK`;
  const content = [
    `${emojis.status.sleep} **AFK — ${rand(SET_MESSAGES)}**`,
    ``,
    `**${username}** is now AFK  •  ${scopeTag}`,
    `**Reason:** ${reason}`,
    ``,
    `*They'll be notified when they return.*`,
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .addSeparatorComponents(sep)],
  };
}

function buildReturnPayload(username, duration) {
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const content = [
    `${emojis.status.welcome_back} **Welcome back — ${rand(BACK_MESSAGES)}**`,
    ``,
    `**${username}** is no longer AFK`,
    `**Total AFK duration:** \`${duration}\``,
    ``,
    `*We missed you. (Not really, but it sounded nice.)*`,
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .addSeparatorComponents(sep)],
  };
}

function buildPingNotifyPayload(afkUsername, reason, duration) {
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const content = [
    `${emojis.status.unreachable} **${rand(PING_MESSAGES)}**`,
    ``,
    `**${afkUsername}** has been AFK for \`${duration}\``,
    `**Reason:** ${reason}`,
  ].join('\n');

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .addSeparatorComponents(sep)],
  };
}

// ─── Command ──────────────────────────────────────────────────────────────────

module.exports = {
  category: 'Utility',
  name: 'afk',
  description: 'Set yourself as AFK with an optional reason and scope',
  slashOnly: false,

  afkStore,
  isAfk,
  formatDuration,
  buildReturnPayload,
  buildPingNotifyPayload,

  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK with an optional reason and scope')
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason for being AFK')
        .setRequired(false))
    .addStringOption(o =>
      o.setName('scope')
        .setDescription('AFK scope — guild only or everywhere (default: guild)')
        .setRequired(false)
        .addChoices(
          { name: 'This server only', value: 'guild' },
          { name: 'Global (all servers)', value: 'global' },
        )),

  async executePrefix(message, args, client) {
    // Check if last arg is "global" or "guild"
    let scope = 'guild';
    const last = args[args.length - 1]?.toLowerCase();
    if (last === 'global' || last === 'guild') {
      scope = last;
      args.pop();
    }
    const reason = args.join(' ') || 'No reason provided';

    afkStore.set(message.author.id, {
      reason,
      timestamp: Date.now(),
      scope,
      guildId: message.guild.id,
    });

    await message.reply(buildSetPayload(message.author.username, reason, scope));
  },

  async executeSlash(interaction, client) {
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const scope = interaction.options.getString('scope') || 'guild';

    afkStore.set(interaction.user.id, {
      reason,
      timestamp: Date.now(),
      scope,
      guildId: interaction.guild.id,
    });

    await interaction.reply(buildSetPayload(interaction.user.username, reason, scope));
  },
};
