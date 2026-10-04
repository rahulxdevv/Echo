const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const { updateVerificationConfig, getVerificationConfig } = require('../../utils/verification');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Verification',
  name: 'verification',
  description: 'Manage the server verification system',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Manage the server verification system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup the verification system')
        .addChannelOption(option =>
          option.setName('channel').setDescription('Channel to send verification message').addChannelTypes(0).setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('Role to give after verification').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of verification')
            .setRequired(true)
            .addChoices(
              { name: 'Button Click (Simple)', value: 'button' },
              { name: 'Math Equation', value: 'math' },
              { name: 'Image Captcha', value: 'captcha' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable the verification system')
        .addBooleanOption(option =>
          option.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('send')
        .setDescription('Send the verification message to the configured channel')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        const type = interaction.options.getString('type');

        await updateVerificationConfig(interaction.guild.id, {
          channelId: channel.id,
          roleId: role.id,
          type: type,
          enabled: true
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Verification Setup Complete**\n\nChannel: ${channel}\nRole: ${role}\nType: **${type}**\n\nUse \`/verification send\` to post the verification message.`)
          );

        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      } 
      else if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        await updateVerificationConfig(interaction.guild.id, { enabled });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Verification System**\n\nThe system is now ${enabled ? 'enabled' : 'disabled'}.`)
          );

        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
      else if (subcommand === 'send') {
        const config = await getVerificationConfig(interaction.guild.id);
        
        if (!config.enabled || !config.channelId || !config.roleId) {
          return replyError(interaction, 'Please setup the verification system first using `/verification setup`.');
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
          return replyError(interaction, 'The configured verification channel could not be found.');
        }

        const button = new ButtonBuilder()
          .setCustomId('verify_start')
          .setLabel('Verify to enter')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🛡️');

        const textDisplay = new TextDisplayBuilder().setContent(
          `# Server Verification\n\nTo gain access to the rest of the server and view all channels, you must complete the verification process.\n\nPlease click the button below and follow the instructions to verify your account.`
        );

        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Large);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(textDisplay)
          .addSeparatorComponents(separator)
          .addActionRowComponents(actionRow => actionRow.setComponents(button));

        const msg = await channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });

        await updateVerificationConfig(interaction.guild.id, { messageId: msg.id });

        const replyContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Verification Message Sent**\n\nSuccessfully sent to ${channel}.`)
          );

        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [replyContainer] });
      }
    } catch (error) {
      console.error('Verification command error:', error);
      await replyError(interaction, 'An error occurred while running the verification command.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permissions to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    try {
      if (subcommand === 'setup') {
        const channel = message.mentions.channels.first();
        const role = message.mentions.roles.first();
        const type = args[3]?.toLowerCase();

        if (!channel || !role || !['button', 'math', 'captcha'].includes(type)) {
          return replyError(message, 'Usage: `verification setup #channel @role <button|math|captcha>`');
        }

        await updateVerificationConfig(message.guild.id, {
          channelId: channel.id,
          roleId: role.id,
          type: type,
          enabled: true
        });

        return message.reply(`Verification setup complete. Channel: ${channel}, Role: ${role}, Type: ${type}. Use \`verification send\` to post the message.`);
      } 
      else if (subcommand === 'toggle') {
        const enabled = args[1]?.toLowerCase() === 'true' || args[1]?.toLowerCase() === 'on';
        await updateVerificationConfig(message.guild.id, { enabled });
        return message.reply(`Verification system is now ${enabled ? 'enabled' : 'disabled'}.`);
      }
      else if (subcommand === 'send') {
        const config = await getVerificationConfig(message.guild.id);
        
        if (!config.enabled || !config.channelId || !config.roleId) {
          return replyError(message, 'Please setup the verification system first.');
        }

        const channel = message.guild.channels.cache.get(config.channelId);
        if (!channel) return replyError(message, 'Verification channel not found.');

        const button = new ButtonBuilder()
          .setCustomId('verify_start')
          .setLabel('Verify to enter')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🛡️');

        const textDisplay = new TextDisplayBuilder().setContent(
          `# Server Verification\n\nTo gain access to the rest of the server and view all channels, you must complete the verification process.\n\nPlease click the button below and follow the instructions to verify your account.`
        );

        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Large);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(textDisplay)
          .addSeparatorComponents(separator)
          .addActionRowComponents(actionRow => actionRow.setComponents(button));

        const msg = await channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });

        await updateVerificationConfig(message.guild.id, { messageId: msg.id });
        return message.reply(`Verification message sent to ${channel}.`);
      } else {
        return replyError(message, 'Invalid subcommand. Use `setup`, `toggle`, or `send`.');
      }
    } catch (error) {
      console.error('Verification command error:', error);
      await replyError(message, 'An error occurred while running the verification command.');
    }
  }
};
