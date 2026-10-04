const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder
} = require('discord.js');
const BoosterConfig = require('../../models/BoosterConfig');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Notifier',
  name: 'booster',
  description: 'Manage server boost notifications',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('booster')
    .setDescription('Manage server boost notifications')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Set the channel for boost notifications')
        .addChannelOption(option =>
          option.setName('channel').setDescription('The channel to send notifications to').addChannelTypes(0).setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('message')
        .setDescription('Set the custom boost message')
        .addStringOption(option =>
          option.setName('text').setDescription('The message text. Use {user} and {server}').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable boost notifications')
        .addBooleanOption(option =>
          option.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    let config = await BoosterConfig.findOne({ guildId: interaction.guild.id });
    if (!config) config = new BoosterConfig({ guildId: interaction.guild.id });

    try {
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel');
        config.channelId = channel.id;
        config.enabled = true;
        await config.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Booster Notifications Configured**\n\nChannel set to ${channel} and system enabled.`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'message') {
        const text = interaction.options.getString('text');
        config.message = text;
        await config.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Booster Message Updated**\n\nNew message:\n${text}`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        config.enabled = enabled;
        await config.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Booster Notifications**\n\nSystem is now ${enabled ? 'enabled' : 'disabled'}.`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    } catch (error) {
      console.error('BoosterNotify error:', error);
      await replyError(interaction, 'An error occurred while managing booster notifications.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permissions to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();
    
    let config = await BoosterConfig.findOne({ guildId: message.guild.id });
    if (!config) config = new BoosterConfig({ guildId: message.guild.id });

    try {
      if (subcommand === 'setup') {
        const channel = message.mentions.channels.first();
        if (!channel) return replyError(message, 'Please mention a channel.');
        
        config.channelId = channel.id;
        config.enabled = true;
        await config.save();

        return message.reply(`✅ Booster notifications configured to use ${channel} and enabled.`);
      } else if (subcommand === 'message') {
        const text = args.slice(1).join(' ');
        if (!text) return replyError(message, 'Please provide a message text. Use {user} and {server}.');

        config.message = text;
        await config.save();

        return message.reply(`✅ Booster message updated:\n${text}`);
      } else if (subcommand === 'toggle') {
        const enabled = args[1]?.toLowerCase() === 'true' || args[1]?.toLowerCase() === 'on';
        config.enabled = enabled;
        await config.save();

        return message.reply(`✅ Booster notifications are now ${enabled ? 'enabled' : 'disabled'}.`);
      } else {
        return replyError(message, 'Invalid subcommand. Use `setup #channel`, `message <text>`, or `toggle <true/false>`.');
      }
    } catch (error) {
      console.error('BoosterNotify error:', error);
      await replyError(message, 'An error occurred while managing booster notifications.');
    }
  }
};
