const chalk = require('chalk');

function formatTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const colors = {
  Dashboard: chalk.magenta,
  Events: chalk.yellow,
  Prefix: chalk.cyan,
  Slash: chalk.green,
  Schemes: chalk.blue,
  Buttons: chalk.red,
  Functions: chalk.white,
  Status: chalk.greenBright,
  Lavalink: chalk.cyanBright,
  Database: chalk.yellowBright,
  Bot: chalk.blueBright,
  Error: chalk.red.bold
};

let discordClient = null;

function setClient(client) {
  discordClient = client;
}

function log(category, message) {
  const time = formatTime();
  const botName = "Echo";
  const categoryColor = colors[category] || chalk.white;
  
  console.log(`${chalk.gray(time)} - ${chalk.blue(botName)} => ${categoryColor(category)} - ${message}`);

  if (category === 'Error' && discordClient && process.env.ERROR_LOG_CHANNEL_ID) {
    const channel = discordClient.channels.cache.get(process.env.ERROR_LOG_CHANNEL_ID);
    if (channel) {
      const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
      const emojis = require('./emojis');
      const content = `# ${emojis.status.warning} Error Log\n\n**Category:** ${category}\n**Message:**\n\`\`\`${message}\`\`\``;
      const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
      channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] }).catch(() => {});
    }
  }
}

module.exports = { log, setClient };
