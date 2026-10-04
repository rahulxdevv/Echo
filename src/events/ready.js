const { loadCommands } = require('../utils/handler');
const { REST, Routes } = require('discord.js');
const chalk = require('chalk');
const { cacheGuildInvites } = require('../utils/invites');
const Giveaway = require('../models/Giveaway');
const { endGiveaway, buildGiveawayContainer } = require('../utils/giveaway');
const { startPolling } = require('../utils/notifierPoller');
const TempRole = require('../models/TempRole');
const {
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    client.config = require('../config');
    const { setClient } = require('../utils/logger');
    setClient(client);
    client.commands = new Map();
    client.slashCommands = new Map();
    client.riffy.init(client.user.id);

    loadCommands(client);

    const slashCommands = [];
    client.slashCommands.forEach(command => {
      slashCommands.push(command.data.toJSON());
    });

    const rest = new REST({ version: '10' }).setToken(client.config.token);

    try {
      await rest.put(
        Routes.applicationCommands(client.config.clientId),
        { body: slashCommands }
      );

      log('Bot', 'Successfully reloaded global application (/) commands.');
    } catch (error) {
      log('Error', `Failed to reload slash commands: ${error.message}`);
    }

    // Count Schemes (Models) and Functions (Utils)
    const modelsCount = fs.readdirSync(path.join(__dirname, '../models')).filter(f => f.endsWith('.js')).length;
    const utilsCount = fs.readdirSync(path.join(__dirname, '../utils')).filter(f => f.endsWith('.js')).length;

    // Count Buttons (approximate by searching for setCustomId)
    let buttonsCount = 0;
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath, { recursive: true }).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      const content = fs.readFileSync(path.join(commandsPath, file), 'utf8');
      buttonsCount += (content.match(/setCustomId/g) || []).length;
    }

    log('Schemes', `Loaded: ${modelsCount}`);
    log('Buttons', `Loaded: ${buttonsCount}`);
    log('Functions', `Loaded: ${utilsCount}`);

    // Caching invites
    let cachedCount = 0;
    for (const guild of client.guilds.cache.values()) {
      try {
        await cacheGuildInvites(guild);
        cachedCount++;
      } catch (error) {
        // Silent
      }
    }

    log('Status', 'Successfully Enabled Status.');
    log('Bot', 'Successfully Bot is Online.');

    // Start giveaway checker
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredGiveaways = await Giveaway.find({
          ended: false,
          endTime: { $lte: now }
        });

        for (const giveaway of expiredGiveaways) {
          try {
            const result = await endGiveaway(giveaway.messageId);

            if (result) {
              const { giveaway: updatedGiveaway, winners } = result;

              const channel = await client.channels.fetch(updatedGiveaway.channelId);
              const message = await channel.messages.fetch(updatedGiveaway.messageId);

              let winnerText = 'No valid participants!';
              if (winners.length > 0) {
                winnerText = winners.map(id => `<@${id}>`).join(', ');
              }

              const container = buildGiveawayContainer({
                prize: updatedGiveaway.prize,
                winners: updatedGiveaway.winners,
                endTime: updatedGiveaway.endTime,
                hostId: updatedGiveaway.hostId,
                participantsCount: updatedGiveaway.participants.length,
                isEnded: true,
                isReroll: false,
                winnerText,
                banner: updatedGiveaway.banner,
                thumbnail: updatedGiveaway.thumbnail
              });

              await message.edit({
                flags: MessageFlags.IsComponentsV2,
                components: [container]
              });

              if (winners.length > 0) {
                await channel.send(`Congratulations ${winnerText}! You won **${updatedGiveaway.prize}**!`);
              }
            }
          } catch (error) {
            console.error(`Error ending giveaway ${giveaway.messageId}:`, error);
          }
        }
      } catch (error) {
        console.error('Error checking giveaways:', error);
      }
    }, 10000); // Check every 10 seconds
    log('Status', 'Giveaway checker started');

    // Start temp role checker
    setInterval(async () => {
      try {
        const expiredRoles = await TempRole.find({ expiresAt: { $lte: new Date() } });
        for (const record of expiredRoles) {
          const guild = client.guilds.cache.get(record.guildId);
          if (guild) {
            const member = await guild.members.fetch(record.userId).catch(() => null);
            if (member) {
              await member.roles.remove(record.roleId, 'Temporary role expired').catch(() => null);
            }
          }
          await TempRole.findByIdAndDelete(record._id);
        }
      } catch (error) {
        console.error('Error checking temp roles:', error);
      }
    }, 60000); // Check every minute
    log('Status', 'Temp role checker started');

    // Start Content Notifier Poller
    startPolling(client);
    log('Status', 'Content Notifier poller started');

    // Rotating Status
    const statuses = [
      { name: `Echo | ${client.config.prefix}help & /help`, type: ActivityType.Watching },
      { name: `Over a ${client.guilds.cache.size} Servers`, type: ActivityType.Watching },
      { name: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} Members`, type: ActivityType.Listening },
      { name: 'Echo | Buy Now', type: ActivityType.Playing },
      { name: `${client.slashCommands.size} Slash Commands`, type: ActivityType.Watching },
      { name: 'Upgrade to Personal Bot', type: ActivityType.Playing }
    ];

    let i = 0;
    setInterval(() => {
      client.user.setPresence({
        activities: [{ name: statuses[i].name, type: statuses[i].type }],
        status: 'online'
      });
      i = (i + 1) % statuses.length;
    }, 10000);
  }
};



