const {
  Client,
  GatewayIntentBits,
  GatewayDispatchEvents,
  Partials
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
require("dotenv").config({ quiet: true });
const chalk = require("chalk");
const connectDB = require("./utils/database");
const { Riffy } = require("riffy");
const { createNowPlayingCard } = require("./utils/musicCard");
const { log } = require("./utils/logger");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
  "1.0.0.1"
]);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ],
});

const nodes = [
  {
    host: "lavalink.jirayu.net",
    password: "youshallnotpass",
    port: 13592,
    secure: false,
  },
];

client.riffy = new Riffy(client, nodes, {
  send: (payload) => {
    const guild = client.guilds.cache.get(payload.d.guild_id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytmsearch",
  restVersion: "v4",
});

async function startBot() {

  try {
    await connectDB();

    log("Events", "Loading events...");
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.name && typeof event.execute === 'function') {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      }
    }
    log("Events", `Loaded Events: ${eventFiles.length}`);

    client.riffy.on("nodeConnect", (node) => {
      log("Lavalink", `Lavalink ${node.name} Node: Ready!`);
    });

    client.riffy.on("nodeError", (node, error) => {
      log("Error", `Lavalink ${node.name} Node Error: ${error.message}`);
    });

    client.riffy.on("trackStart", async (player, track) => {
      const channel = client.channels.cache.get(player.textChannel);
      if (!channel) return;

      try {
        const attachment = await createNowPlayingCard(track, player.position || 0);
        await channel.send({ files: [attachment] });
      } catch (error) {
        console.error('Track start card error:', error);
        await channel.send(`Now playing | **${track.info.title}** by **${track.info.author || 'Unknown artist'}**`);
      }
    });

    client.riffy.on("queueEnd", async (player) => {
      const channel = client.channels.cache.get(player.textChannel);
      const autoplay = false;
      if (autoplay) {
        player.autoplay(player);
      } else {
        player.destroy();
        if (channel) {
          await channel.send("The queue has finished. Add another track whenever you're ready.");
        }
      }
    });

    client.on("raw", (d) => {
      if (
        ![
          GatewayDispatchEvents.VoiceStateUpdate,
          GatewayDispatchEvents.VoiceServerUpdate,
        ].includes(d.t)
      )
        return;
      client.riffy.updateVoiceState(d);
    });

    log("Bot", "Logging into Discord...");
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    log("Error", `Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

process.on("unhandledRejection", (error) => {
  console.error(chalk.red.bold("✗ Unhandled Promise Rejection:"), error);
});

process.on("uncaughtException", (error) => {
  console.error(chalk.red.bold("✗ Uncaught Exception:"), error);
  process.exit(1);
});

startBot();


