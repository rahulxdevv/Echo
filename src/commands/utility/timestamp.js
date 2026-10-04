const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Utility',
  name: 'timestamp',
  description: 'Generate Discord timestamp formats',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Generate Discord timestamp formats')
    .addStringOption(option =>
      option
        .setName('time')
        .setDescription('Time in format: YYYY-MM-DD HH:MM or "now"')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    const timeInput = args.join(' ') || 'now';
    await message.reply(createTimestampPayload(timeInput));
  },

  async executeSlash(interaction, client) {
    const timeInput = interaction.options.getString('time') || 'now';
    await interaction.reply(createTimestampPayload(timeInput));
  }
};

function createTimestampPayload(timeInput) {
  let timestamp;

  if (timeInput.toLowerCase() === 'now') {
    timestamp = Math.floor(Date.now() / 1000);
  } else {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) {
      const errorText = new TextDisplayBuilder()
        .setContent(`${emojis.status.warning} Invalid time format! Use: \`YYYY-MM-DD HH:MM\` or \`now\`\nExample: \`2026-12-25 15:30\``);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorText);

      return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      };
    }
    timestamp = Math.floor(date.getTime() / 1000);
  }

  let timestampText = `# ${emojis.status.clock} Discord Timestamps\n\n`;
  timestampText += `**Unix Timestamp:** \`${timestamp}\`\n\n`;
  timestampText += `**Formats:**\n`;
  timestampText += `\`<t:${timestamp}:t>\` → <t:${timestamp}:t> (Short Time)\n`;
  timestampText += `\`<t:${timestamp}:T>\` → <t:${timestamp}:T> (Long Time)\n`;
  timestampText += `\`<t:${timestamp}:d>\` → <t:${timestamp}:d> (Short Date)\n`;
  timestampText += `\`<t:${timestamp}:D>\` → <t:${timestamp}:D> (Long Date)\n`;
  timestampText += `\`<t:${timestamp}:f>\` → <t:${timestamp}:f> (Short Date/Time)\n`;
  timestampText += `\`<t:${timestamp}:F>\` → <t:${timestamp}:F> (Long Date/Time)\n`;
  timestampText += `\`<t:${timestamp}:R>\` → <t:${timestamp}:R> (Relative)\n`;

  const textDisplay = new TextDisplayBuilder().setContent(timestampText);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
