const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder
} = require('discord.js');
const ModmailConfig = require('../../models/ModmailConfig');
const { closeModmail } = require('../../utils/modmail');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Modmail',
  name: 'modmail',
  description: 'Manage the ModMail system',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('modmail')
    .setDescription('Manage the ModMail system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Setup the ModMail category and roles')
        .addChannelOption(option =>
          option.setName('category').setDescription('The category to create modmail channels in').addChannelTypes(4).setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('log_channel').setDescription('Channel to log closed modmails').addChannelTypes(0).setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('Staff role that manages modmail').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable or disable ModMail')
        .addBooleanOption(option =>
          option.setName('enabled').setDescription('Enable or disable').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current modmail ticket')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'setup') {
        const category = interaction.options.getChannel('category');
        const logChannel = interaction.options.getChannel('log_channel');
        const role = interaction.options.getRole('role');

        let config = await ModmailConfig.findOne({ guildId: interaction.guild.id });
        if (!config) config = new ModmailConfig({ guildId: interaction.guild.id });

        config.categoryId = category.id;
        config.logChannelId = logChannel.id;
        config.roleId = role.id;
        config.enabled = true;
        await config.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **ModMail Setup Complete**\n\nCategory: ${category}\nLog Channel: ${logChannel}\nStaff Role: ${role}\nModMail is now **enabled**.`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'toggle') {
        const enabled = interaction.options.getBoolean('enabled');
        
        let config = await ModmailConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return replyError(interaction, 'Please setup ModMail first using `/modmail setup`.');

        config.enabled = enabled;
        await config.save();

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **ModMail System**\n\nThe system is now ${enabled ? 'enabled' : 'disabled'}.`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'close') {
        const closedUserId = await closeModmail(interaction.channel.id, interaction.user, interaction.guild);
        
        if (closedUserId) {
          const user = await client.users.fetch(closedUserId).catch(() => null);
          if (user) {
            await user.send('🔒 **Your ModMail ticket has been closed by the staff.**').catch(() => {});
          }

          const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`🔒 **Ticket Closed**\n\nThis ModMail ticket has been officially closed and the user has been notified. You may now delete this channel.`)
          );
          await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } else {
          return replyError(interaction, 'This channel is not an active ModMail ticket.');
        }
      }
    } catch (error) {
      console.error('Modmail command error:', error);
      await replyError(interaction, 'An error occurred while running the ModMail command.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(message, 'You need Manage Server permissions to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    try {
      if (subcommand === 'setup') {
        // Simple regex fallback since category mentions aren't natively supported like text channels
        // We'll just ask them to use slash commands for setup since Category parsing in prefix is messy
        return replyError(message, 'Please use the slash command `/modmail setup` to configure ModMail properly.');
      } else if (subcommand === 'toggle') {
        const enabled = args[1]?.toLowerCase() === 'true' || args[1]?.toLowerCase() === 'on';
        let config = await ModmailConfig.findOne({ guildId: message.guild.id });
        if (!config) return replyError(message, 'Please setup ModMail first using `/modmail setup`.');
        
        config.enabled = enabled;
        await config.save();
        return message.reply(`✅ ModMail system is now ${enabled ? 'enabled' : 'disabled'}.`);
      } else if (subcommand === 'close') {
        const closedUserId = await closeModmail(message.channel.id, message.author, message.guild);
        
        if (closedUserId) {
          const user = await client.users.fetch(closedUserId).catch(() => null);
          if (user) {
            await user.send('🔒 **Your ModMail ticket has been closed by the staff.**').catch(() => {});
          }
          return message.reply('🔒 **Ticket Closed**\nThis ModMail ticket has been officially closed. You may now delete this channel.');
        } else {
          return replyError(message, 'This channel is not an active ModMail ticket.');
        }
      } else {
        return replyError(message, 'Available subcommands: `setup` (slash only), `toggle`, `close`');
      }
    } catch (error) {
      console.error('Modmail command error:', error);
      await replyError(message, 'An error occurred while running the ModMail command.');
    }
  }
};
