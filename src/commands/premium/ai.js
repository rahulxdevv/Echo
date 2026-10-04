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
const axios = require('axios');

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
        .setDescription('Chat with the advanced Echo AI (Premium Only)')
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
        .setName('disable')
        .setDescription('Disable the auto-AI chat channel')
    ),

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // Check premium status (Owner of guild or user)
    const isPremium = await PremiumUser.findOne({ userId: interaction.user.id }) || 
                      await PremiumUser.findOne({ userId: interaction.guild.ownerId });

    if (!isPremium) {
      return interaction.reply({ 
        content: `${emojis.status.warning} This is a **Premium Feature**. Please support the bot to access advanced AI capabilities.`, 
        ephemeral: true 
      });
    }

    if (sub === 'chat') {
      await interaction.deferReply();
      const prompt = interaction.options.getString('prompt');

      try {
        const response = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=You are Echo AI, a helpful and friendly assistant integrated into the Echo Discord bot.`);
        
        const aiResponse = response.data;
        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.categories.social} Echo AI\n\n**Prompt:** ${prompt}\n\n**Response:**\n${aiResponse.substring(0, 1800)}`)
        );

        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      } catch (error) {
        await interaction.editReply('Sorry, I encountered an error while talking to the AI. Please try again later.');
      }
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

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} AI Channel Set\n\nAll messages in ${channel} will now be automatically answered by **Echo AI**.`)
      );
      await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    if (sub === 'disable') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need `Manage Channels` permission to use this command.', ephemeral: true });
      }

      await AIConfig.findOneAndDelete({ guildId: interaction.guild.id });
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} AI Channel Disabled\n\nAutomatic AI chat has been disabled.`)
      );
      await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
  }
};
