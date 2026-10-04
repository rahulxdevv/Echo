require('dotenv').config({ quiet: true });

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  mongodb: process.env.MONGODB_URI,
  prefix: '!'
};

