const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'Moderation',
  name: 'purge',
  description: 'Clean messages from channel with various filters',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Clean messages from channel with various filters')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Delete messages from specific user')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('contains')
        .setDescription('Delete messages containing this text')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('after')
        .setDescription('Delete messages after this message ID')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('before')
        .setDescription('Delete messages before this message ID')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async executePrefix(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ content: 'You do not have permission to manage messages!', flags: [64] });
    }

    if (!args[0]) {
      return message.reply({ 
        content: 'Usage: `!purge <amount> [user] [contains] [after/before: message_id]`',
        flags: [64]
      });
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ content: 'Please specify a number between 1 and 100!', flags: [64] });
    }

    try {
      await message.delete();
      
      let options = { limit: Math.min(amount, 100) };
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const userMatch = arg.match(/^<@!?(\d+)>$/);
        if (userMatch) {
          const userId = userMatch[1];
          options.before = message.id;
          break;
        }
      }

      const messages = await message.channel.messages.fetch(options);
      let filtered = messages;
      const userMention = args.find(arg => arg.match(/^<@!?(\d+)>$/));
      if (userMention) {
        const userId = userMention.match(/^<@!?(\d+)>$/)[1];
        filtered = messages.filter(m => m.author.id === userId);
      }
      const contentArg = args.find(arg => !arg.match(/^<@!?(\d+)>$/) && !arg.match(/^\d+$/));
      if (contentArg) {
        filtered = filtered.filter(m => m.content.toLowerCase().includes(contentArg.toLowerCase()));
      }

      if (filtered.size === 0) {
        return message.channel.send({ 
          content: '✨ No messages found matching the criteria!' 
        }).then(msg => setTimeout(() => msg.delete(), 3000));
      }

      const deleted = await message.channel.bulkDelete(filtered, true);
      
      await message.channel.send({
        content: `🗑️ Successfully deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}!`,
        flags: [64]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
      
    } catch (error) {
      console.error('Purge error:', error);
      await message.reply({ content: 'There was an error purging messages!', flags: [64] });
    }
  },

  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    const contains = interaction.options.getString('contains');
    const after = interaction.options.getString('after');
    const before = interaction.options.getString('before');

    try {
      let options = { limit: Math.min(amount, 100) };
      if (after) options.after = after;
      if (before) options.before = before;

      const messages = await interaction.channel.messages.fetch(options);
      let filtered = messages;
      if (user) {
        filtered = filtered.filter(m => m.author.id === user.id);
      }

      if (contains) {
        filtered = filtered.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));
      }

      if (filtered.size === 0) {
        return interaction.reply({ 
          content: '✨ No messages found matching the criteria!',
          flags: [64]
        });
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);
      
      await interaction.reply({
        content: `🗑️ Successfully deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}!`,
        flags: [64]
      }).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      });
      
    } catch (error) {
      console.error('Purge error:', error);
      await interaction.reply({ content: 'There was an error purging messages!', flags: [64] });
    }
  }
};

