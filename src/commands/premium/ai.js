const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const PremiumUser = require('../../models/PremiumUser');
const AIConfig = require('../../models/AIConfig');
const emojis = require('../../utils/emojis');
const {
  askAI,
  askCustomAI,
  getAIConfig,
  setCustomAIConfig,
  clearCustomAIConfig,
  isValidBaseUrl,
  isCustomConfigured,
  maskApiKey,
  toUserErrorMessage,
  logAIError,
  testCustomAI,
} = require('../../utils/ai');
const { getHistory, addTurn } = require('../../utils/aiMemory');

function buildContainer(title, body) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${title}\n\n${body}`)
  );
}

function isServerOwner(interaction) {
  return Boolean(interaction.guild && interaction.user && interaction.guild.ownerId === interaction.user.id);
}

module.exports = {
  category: 'Premium',
  name: 'ai',
  description: 'Chat with an advanced AI or setup AI channels',
  slashOnly: true,

  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with an advanced AI or setup AI channels')
    .addSubcommand(sub =>
      sub
        .setName('chat')
        .setDescription('Chat with the advanced Echo AI (Premium Only, or with your own key)')
        .addStringOption(opt => opt.setName('prompt').setDescription('Your question or message').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Designate a channel for auto-AI chat (Premium Only)')
        .addChannelOption(opt => opt.setName('channel').setDescription('The channel to use').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Server owner: set your own AI base URL + API key (OpenAI-compatible)')
        .addStringOption(opt => opt.setName('base_url').setDescription('Base URL, e.g. https://api.openai.com/v1'))
        .addStringOption(opt => opt.setName('api_key').setDescription('API key for your provider'))
        .addStringOption(opt => opt.setName('model').setDescription('Model name, e.g. gpt-4o-mini'))
        .addBooleanOption(opt => opt.setName('clear').setDescription('Clear the custom provider'))
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Disable the auto-AI chat channel')
    ),

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'config') {
      return this.handleConfig(interaction);
    }

    const isPremium = await PremiumUser.findOne({ userId: interaction.user.id }) ||
                      await PremiumUser.findOne({ userId: interaction.guild.ownerId });
    const guildConfig = await getAIConfig(interaction.guild.id).catch(() => null);
    const hasCustom = isCustomConfigured(guildConfig);

    if (!isPremium && !hasCustom) {
      return interaction.reply({
        content: `${emojis.status.warning} This is a **Premium Feature**. Please support the bot to access advanced AI capabilities, or set your own API key with \`/ai config\`.`,
        ephemeral: true
      });
    }

    if (sub === 'chat') {
      await interaction.deferReply();
      const prompt = interaction.options.getString('prompt');

      try {
        const history = getHistory(interaction.guild.id, interaction.channel.id);
        const aiResponse = await askAI(interaction.guild.id, prompt, { history });

        addTurn(interaction.guild.id, interaction.channel.id, {
          userId: interaction.user.id,
          username: interaction.user.username,
          userContent: prompt,
          assistantContent: String(aiResponse),
        });

        const container = buildContainer(
          `# ${emojis.categories.social} Echo AI`,
          `**Prompt:** ${prompt}\n\n**Response:**\n${String(aiResponse).substring(0, 1800)}`
        );

        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      } catch (error) {
        logAIError('chat', error);
        const safeMessage = toUserErrorMessage(error, { isCustom: hasCustom });
        await interaction.editReply(`${emojis.status.warning} ${safeMessage}`);
      }
      return;
    }

    if (sub === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need `Manage Channels` permission to use this command.', ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      await AIConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { channelId: channel.id, enabled: true },
        { upsert: true }
      );

      const container = buildContainer(
        `# ${emojis.status.success} AI Channel Set`,
        `All messages in ${channel} will now be automatically answered by **Echo AI**.`
      );
      await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      return;
    }

    if (sub === 'disable') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need `Manage Channels` permission to use this command.', ephemeral: true });
      }

      await AIConfig.findOneAndDelete({ guildId: interaction.guild.id });
      const container = buildContainer(
        `# ${emojis.status.success} AI Channel Disabled`,
        `Automatic AI chat has been disabled.`
      );
      await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
  },

  async handleConfig(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    if (!isServerOwner(interaction)) {
      return interaction.reply({
        content: `${emojis.status.warning} Only the **server owner** can configure a custom AI provider.`,
        ephemeral: true,
      });
    }

    const baseUrl = interaction.options.getString('base_url') ?? undefined;
    const apiKey = interaction.options.getString('api_key') ?? undefined;
    const model = interaction.options.getString('model') ?? undefined;
    const clear = interaction.options.getBoolean('clear') === true;
    const guildId = interaction.guild.id;

    const existing = await getAIConfig(guildId).catch(() => null);

    if (clear) {
      await clearCustomAIConfig(guildId);
      const container = buildContainer(
        `# ${emojis.status.success} Custom AI Cleared`,
        `Your custom provider was removed. Echo will use the default AI again.`
      );
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    const hasInput = baseUrl !== undefined || apiKey !== undefined || model !== undefined;

    if (!hasInput) {
      const configured = isCustomConfigured(existing);
      const body = configured
        ? [
            `**Provider:** Set (hidden for privacy)`,
            `**Model:** ${existing.model || 'gpt-4o-mini (default)'}`,
            `**API key:** ${maskApiKey(existing.apiKey)}`,
            ``,
            'Set a new value with `/ai config base_url:... api_key:... model:...`.',
            'Clear it with `/ai config clear:true`.',
          ].join('\n')
        : [
            'No custom provider set. Echo is using the default AI.',
            ``,
            'As the server owner, set your own OpenAI-compatible endpoint:',
            '` /ai config base_url:https://api.openai.com/v1 api_key:sk-... model:gpt-4o-mini `',
          ].join('\n');

      const container = buildContainer(`# ${emojis.common.gear} AI Provider`, body);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    const nextBaseUrl = baseUrl ?? existing?.baseUrl ?? '';
    const nextApiKey = apiKey ?? existing?.apiKey ?? '';
    const nextModel = model ?? existing?.model ?? '';

    if (baseUrl !== undefined && baseUrl !== '' && !isValidBaseUrl(baseUrl)) {
      return interaction.reply({
        content: `${emojis.status.warning} Base URL must be a valid http(s) URL, e.g. \`https://api.openai.com/v1\`.`,
        ephemeral: true,
      });
    }

    if ((nextBaseUrl || nextApiKey) && (!String(nextBaseUrl).trim() || !String(nextApiKey).trim())) {
      return interaction.reply({
        content: `${emojis.status.warning} Both **base_url** and **api_key** are required for a custom provider.`,
        ephemeral: true,
      });
    }

    if (nextModel && String(nextModel).length > 100) {
      return interaction.reply({
        content: `${emojis.status.warning} Model name must be 100 characters or fewer.`,
        ephemeral: true,
      });
    }

    const saved = await setCustomAIConfig(guildId, {
      baseUrl: nextBaseUrl ? nextBaseUrl : null,
      apiKey: nextApiKey ? nextApiKey : null,
      model: nextModel ? nextModel : null,
    });

    const test = await testCustomAI(saved);
    if (!test.ok) logAIError('test', new Error(test.message));

    const container = buildContainer(
      `# ${emojis.status.success} Custom AI Saved`,
      [
        `**Provider:** Set (hidden for privacy)`,
        `**Model:** ${saved.model || 'gpt-4o-mini (default)'}`,
        `**API key:** ${maskApiKey(saved.apiKey)}`,
        `**Connection test:** ${test.ok ? 'Passed' : `Failed - ${test.message}`}`,
        ``,
        'Echo will now use your provider for `/ai chat` and auto-AI channels in this server.',
      ].join('\n')
    );

    return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
  },
};
