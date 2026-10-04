const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} = require('discord.js');
const { addReactionRole, removeReactionRole, getGuildReactionRoles } = require('../../utils/reactionRole');
const { replyError } = require('../../utils/respond');

module.exports = {
  category: 'Reaction Role',
  name: 'reactionrole',
  description: 'Manage reaction roles for the server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles for the server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a reaction role to an existing message')
        .addChannelOption(option =>
          option.setName('channel').setDescription('The channel containing the message').addChannelTypes(0).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message_id').setDescription('The ID of the message').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emoji').setDescription('The emoji for the reaction (either a standard emoji or custom emoji id)').setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role').setDescription('The role to give when reacting').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a reaction role from an existing message')
        .addChannelOption(option =>
          option.setName('channel').setDescription('The channel containing the message').addChannelTypes(0).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('message_id').setDescription('The ID of the message').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('emoji').setDescription('The emoji of the reaction role to remove').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all active reaction roles in the server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('createpanel')
        .setDescription('Create a brand new reaction role panel')
        .addChannelOption(option =>
          option.setName('channel').setDescription('Channel to send the panel').addChannelTypes(0).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('title').setDescription('Title of the panel').setRequired(true)
        )
        .addStringOption(option =>
          option.setName('description').setDescription('Description of the panel').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (subcommand === 'add') {
        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const emojiInput = interaction.options.getString('emoji');
        const role = interaction.options.getRole('role');

        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message) return replyError(interaction, 'Message not found in the specified channel.');

        // Format emoji properly if it's a custom emoji
        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
        if (customEmojiMatch) {
          emoji = customEmojiMatch[1];
        }

        await message.react(emoji).catch(err => {
          throw new Error('Could not add reaction. Make sure the emoji is valid and I have access to it.');
        });

        await addReactionRole(interaction.guild.id, channel.id, messageId, emoji, role.id);

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Reaction Role Added**\n\nAdded reaction ${emojiInput} for role ${role} to [this message](${message.url}).`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });

      } else if (subcommand === 'remove') {
        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const emojiInput = interaction.options.getString('emoji');

        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
        if (customEmojiMatch) {
          emoji = customEmojiMatch[1];
        }

        const result = await removeReactionRole(interaction.guild.id, messageId, emoji);

        if (result) {
          const message = await channel.messages.fetch(messageId).catch(() => null);
          if (message) {
            const reaction = message.reactions.cache.get(emoji);
            if (reaction) {
              await reaction.remove().catch(() => null);
            }
          }

          const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`✅ **Reaction Role Removed**\n\nSuccessfully removed reaction role for emoji ${emojiInput}.`)
          );
          return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        } else {
          return replyError(interaction, 'Reaction role not found in the database.');
        }
      } else if (subcommand === 'list') {
        const roles = await getGuildReactionRoles(interaction.guild.id);
        
        if (roles.length === 0) {
          const container = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Reaction Roles**\n\nThere are no active reaction roles set up in this server.`)
          );
          return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

        const lines = roles.map((rr, idx) => {
          const isCustom = rr.emoji.length > 5; // Hacky way to check if it's an ID
          const displayEmoji = isCustom ? `<:emoji:${rr.emoji}>` : rr.emoji;
          return `${idx + 1}. Message: [Link](https://discord.com/channels/${interaction.guild.id}/${rr.channelId}/${rr.messageId}) | Emoji: ${displayEmoji} | Role: <@&${rr.roleId}>`;
        });

        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Active Reaction Roles**\n\n${lines.join('\n')}`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      } else if (subcommand === 'createpanel') {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');

        const separator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
        const textDisplay = new TextDisplayBuilder().setContent(`# ${title}\n\n${description}`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(textDisplay)
          .addSeparatorComponents(separator);

        const msg = await channel.send({
          flags: MessageFlags.IsComponentsV2,
          components: [container]
        });

        const replyContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`✅ **Panel Created**\n\nPanel posted successfully in ${channel}.\nYou can now use \`/reactionrole add\` with the Message ID: \`${msg.id}\` to attach roles!`)
        );
        return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [replyContainer] });
      }
    } catch (error) {
      console.error('ReactionRole error:', error);
      await replyError(interaction, error.message || 'An error occurred while managing reaction roles.');
    }
  },

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return replyError(message, 'You need Manage Roles permission to use this command.');
    }

    const subcommand = args[0]?.toLowerCase();

    try {
      if (subcommand === 'add') {
        const channel = message.mentions.channels.first();
        const messageId = args[2];
        const emojiInput = args[3];
        const role = message.mentions.roles.first();

        if (!channel || !messageId || !emojiInput || !role) {
          return replyError(message, 'Usage: `reactionrole add #channel <message_id> <emoji> @role`');
        }

        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (!msg) return replyError(message, 'Message not found.');

        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
        if (customEmojiMatch) emoji = customEmojiMatch[1];

        await msg.react(emoji).catch(err => {
          throw new Error('Could not add reaction. Valid emoji?');
        });

        await addReactionRole(message.guild.id, channel.id, messageId, emoji, role.id);
        return message.reply(`✅ Added reaction ${emojiInput} for role ${role.name}.`);

      } else if (subcommand === 'remove') {
        const channel = message.mentions.channels.first();
        const messageId = args[2];
        const emojiInput = args[3];

        if (!channel || !messageId || !emojiInput) {
          return replyError(message, 'Usage: `reactionrole remove #channel <message_id> <emoji>`');
        }

        let emoji = emojiInput;
        const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
        if (customEmojiMatch) emoji = customEmojiMatch[1];

        const result = await removeReactionRole(message.guild.id, messageId, emoji);
        if (result) {
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (msg) {
            const reaction = msg.reactions.cache.get(emoji);
            if (reaction) await reaction.remove().catch(() => null);
          }
          return message.reply(`✅ Removed reaction role for emoji ${emojiInput}.`);
        } else {
          return replyError(message, 'Reaction role not found.');
        }
      } else if (subcommand === 'list') {
        const roles = await getGuildReactionRoles(message.guild.id);
        if (roles.length === 0) return message.reply('No active reaction roles.');

        const lines = roles.map((rr, idx) => {
          const isCustom = rr.emoji.length > 5;
          const displayEmoji = isCustom ? `<:emoji:${rr.emoji}>` : rr.emoji;
          return `${idx + 1}. Message ID: ${rr.messageId} | Emoji: ${displayEmoji} | Role: <@&${rr.roleId}>`;
        });
        
        return message.reply(`**Active Reaction Roles**\n\n${lines.join('\n')}`);
      } else {
        return replyError(message, 'Available subcommands: `add`, `remove`, `list`');
      }
    } catch (error) {
      console.error('ReactionRole error:', error);
      await replyError(message, error.message || 'An error occurred while managing reaction roles.');
    }
  }
};
