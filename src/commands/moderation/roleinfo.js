const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { replyWithCard } = require('../../utils/respond');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Moderation',
  name: 'roleinfo',
  description: 'Get information about a role',
  slashOnly: false,
  
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Get information about a role')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('The role to get info about')
        .setRequired(false)),

  async executePrefix(message, args, client) {
    let role;
    
    if (message.mentions.roles.first()) {
      role = message.mentions.roles.first();
    } else if (args[0]) {
      role = message.guild.roles.cache.find(r => 
        r.name.toLowerCase() === args.join(' ').toLowerCase() ||
        r.id === args[0] ||
        `<@&${r.id}>` === args[0]
      );
    } else {
      role = message.member.roles.highest;
    }

    if (!role) {
      return message.reply({ content: 'Could not find that role!', flags: [64] });
    }

    const embed = {
      color: role.color || 0x0099FF,
      title: `${emojis.info.role} Role Information: ${role.name}`,
      thumbnail: { url: role.iconURL() },
      fields: [
        { name: `${emojis.info.id} Role ID`, value: role.id, inline: true },
        { name: `${emojis.info.name} Name`, value: role.name, inline: true },
        { name: `${emojis.info.calendar} Created`, value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: `${emojis.info.members} Members`, value: `${role.members.size}`, inline: true },
        { name: `${emojis.media.paint} Color`, value: role.hexColor || 'Default', inline: true },
        { name: `${emojis.info.pin} Position`, value: `${role.position}`, inline: true },
        { name: `${emojis.info.list} Permissions`, value: role.permissions.bitfield.toString(), inline: false },
        { name: `${emojis.categories.setup} Features`, value: role.tags?.botId ? 'Bot Role' : 'Normal Role', inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    await replyWithCard(message, embed);
  },

  async executeSlash(interaction) {
    let role = interaction.options.getRole('role');
    
    if (!role) {
      role = interaction.member.roles.highest;
    }

    const embed = {
      color: role.color || 0x0099FF,
      title: `${emojis.info.role} Role Information: ${role.name}`,
      thumbnail: { url: role.iconURL() },
      fields: [
        { name: `${emojis.info.id} Role ID`, value: role.id, inline: true },
        { name: `${emojis.info.name} Name`, value: role.name, inline: true },
        { name: `${emojis.info.calendar} Created`, value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
        { name: `${emojis.info.members} Members`, value: `${role.members.size}`, inline: true },
        { name: `${emojis.media.paint} Color`, value: role.hexColor || 'Default', inline: true },
        { name: `${emojis.info.pin} Position`, value: `${role.position}`, inline: true },
        { name: `${emojis.info.list} Permissions`, value: role.permissions.bitfield.toString(), inline: false },
        { name: `${emojis.categories.setup} Features`, value: role.tags?.botId ? 'Bot Role' : 'Normal Role', inline: true }
      ],
      timestamp: new Date().toISOString()
    };

    await replyWithCard(interaction, embed);
  }
};




