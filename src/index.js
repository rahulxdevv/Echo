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

const lavalinkHost = String(process.env.LAVALINK_HOST || '').trim();
const lavalinkPort = Number(String(process.env.LAVALINK_PORT || '').trim());
const nodes = lavalinkHost && Number.isInteger(lavalinkPort) && lavalinkPort > 0
  ? [
      {
        host: lavalinkHost,
        password: String(process.env.LAVALINK_PASSWORD || '').trim(),
        port: lavalinkPort,
        secure: String(process.env.LAVALINK_SECURE || "false").toLowerCase() === "true",
      },
    ]
  : [];

client.riffy = nodes.length
  ? new Riffy(client, nodes, {
      send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
      },
      defaultSearchPlatform: "ytmsearch",
      restVersion: "v4",
    })
  : null;

client.lavalinkConfigured = nodes.length > 0;
if (!nodes.length) {
  log("Lavalink", "No LAVALINK_HOST set, music disabled.");
}

async function startBot() {

  try {
    const missing = [];
    if (!process.env.DISCORD_TOKEN) missing.push('DISCORD_TOKEN');
    if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
    if (!process.env.CLIENT_ID) missing.push('CLIENT_ID');
    if (missing.length > 0) {
      log('Error', `Missing required env vars: ${missing.join(', ')}. Check your environment config.`);
      process.exit(1);
    }

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

    if (client.riffy) {
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

      client.riffy.on("trackError", async (player, track, error) => {
        log("Error", `Track error: ${error.message}`);
      });

      client.riffy.on("queueEnd", async (player) => {
        if (player.current || player.playing) return;
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
    }

    client.on("raw", (d) => {
      if (
        ![
          GatewayDispatchEvents.VoiceStateUpdate,
          GatewayDispatchEvents.VoiceServerUpdate,
        ].includes(d.t)
      )
        return;
      client.riffy?.updateVoiceState(d);
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


