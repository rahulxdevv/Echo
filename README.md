# Echo — Advanced Multi-Purpose Discord Bot

A premium, feature-rich multi-category Discord bot built with `discord.js` v14 using **Components V2** for all responses. Supports both prefix and slash commands with MongoDB-backed persistence, a full music system, economy, advanced moderation, and a suite of server management tools.

---

## Highlights

- **Prefix & Slash command** support across all categories
- **Components V2** throughout — no plain embeds, premium UI everywhere
- **Canvas banner** in the help menu (dynamically generated with bot avatar)
- **MongoDB** persistence for economy, moderation, levelling, tickets, modmail, and more
- **Music** via Riffy + Lavalink with canvas now-playing cards
- **Giphy API** integration for animated GIF social commands
- **18+ categories** covering setup, utility, moderation, fun, economy, levelling, and more
- Global slash command registration on startup
- Auto-reload with nodemon in development

---

## Tech Stack

| Package | Purpose |
|---|---|
| `discord.js` v14 | Core Discord API wrapper |
| `mongoose` | MongoDB ORM |
| `@napi-rs/canvas` | Canvas image generation |
| `riffy` | Lavalink music client |
| `axios` | HTTP requests (APIs, RSS) |
| `dotenv` | Environment variable loading |
| `chalk` | Console styling |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```env
DISCORD_TOKEN=your_discord_bot_token
MONGODB_URI=your_mongodb_connection_string
CLIENT_ID=your_discord_client_id

# Optional but recommended
GIPHY_API_KEY=your_giphy_api_key
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
SUPPORT_SERVER_URL=https://discord.gg/your-server
VOTE_URL=https://top.gg/bot/your_bot_id/vote
```

### 3. Start the bot

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Your bot token from Discord Developer Portal |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `CLIENT_ID` | ✅ | Discord application client ID |
| `GIPHY_API_KEY` | Recommended | Giphy API key for animated GIF social commands |
| `TWITCH_CLIENT_ID` | Optional | Twitch app client ID for stream notifications |
| `TWITCH_CLIENT_SECRET` | Optional | Twitch app client secret |
| `SUPPORT_SERVER_URL` | Optional | Link shown in the help menu |
| `VOTE_URL` | Optional | top.gg vote link shown in the help menu |

---

## Project Structure

```
src/
  commands/
    automod/          Automated moderation rules
    economy/          Wallet, bank, shop, gambling
    fun/              fun.js — 15 subcommands
    games/            Trivia, tictactoe, dice, guess
    giveaway/         Giveaway management
    image/            image.js — 18 subcommands (animals, text effects, media)
    info/             Help menu, avatar, serverinfo, userinfo
    invites/          Invite tracking and stats
    join2create/      Dynamic voice channel creation
    levelling/        XP tracking, rank cards, rewards
    messages/         Message stats and leaderboard
    moderation/       Ban, kick, mute, warn, snipe, etc.
    modmail/          Two-way DM ticket system
    music/            Play, queue, skip, now playing, etc.
    notifier/         Booster & content (YouTube/Twitch) alerts
    reactionrole/     Role assignment via reactions
    social/           GIF-powered social interactions
    sticky/           Sticky messages per channel
    suggestion/       Suggestion box with voting
    tickets/          Support ticket system
    tools/            Converters and utilities
    utility/          AFK, poll, remind, embed, etc.
    verification/     CAPTCHA, math, and button verification
    welcome/          Canvas welcome card system
  events/             Event handlers (messageCreate, ready, etc.)
  models/             Mongoose schemas
  utils/              Shared helpers (canvas, giphy, respond, etc.)
  config.js
  index.js
```

---

## Command Categories

### ⚙️ Setup

Server systems configured via dedicated commands:

| Command | Description |
|---|---|
| `/notifier add` | Add a YouTube or Twitch content notifier |
| `/notifier remove` | Remove a notifier |
| `/notifier list` | List all active notifiers |
| `/booster setup` | Configure boost notification channel |
| `/booster message` | Set custom boost message |
| `/booster toggle` | Enable/disable boost notifications |
| `/verification setup` | Setup captcha/math/button verification |
| `/sticky set` | Set a sticky message in a channel |
| `/sticky remove` | Remove a sticky message |
| `/join2create setup` | Configure auto voice channel creation |
| `/modmail setup` | Configure modmail system |
| `/modmail toggle` | Enable/disable modmail |
| `/modmail close` | Close a modmail thread |
| `/reactionrole add` | Add a reaction role |
| `/reactionrole remove` | Remove a reaction role |
| `/reactionrole list` | List all reaction roles |
| `/reactionrole createpanel` | Create a reaction role panel |
| `/suggestion setup` | Configure suggestion channel |
| `/suggestion toggle` | Enable/disable suggestions |
| `/suggest` | Submit a suggestion |

---

### 🔧 Utility

| Command | Description |
|---|---|
| `/afk` | Set AFK status with optional scope (guild/global) |
| `/poll` | Create a reaction poll |
| `/remind` | Set a personal reminder |
| `/calculate` | Evaluate a math expression |
| `/choose` | Randomly choose from a list |
| `/timestamp` | Generate Discord timestamp formats |
| `/uptime` | Show bot uptime |
| `/randomnumber` | Generate a random number in a range |
| `/base64` | Encode or decode base64 text |
| `/embed` | Create a custom embed message |
| `/color` | Get info and preview from a hex color code |

---

### ℹ️ Info

| Command | Description |
|---|---|
| `/help` | Dynamic help menu with canvas banner and category selector |
| `/avatar` | Get a user's avatar |
| `/serverinfo` | View server information |
| `/userinfo` | View user information |

---

### 🛡️ Moderation

| Command | Description |
|---|---|
| `/ban` | Ban a member |
| `/kick` | Kick a member |
| `/mute` / `/unmute` | Mute or unmute a member |
| `/timeout` | Timeout a member |
| `/warn` / `/warnings` | Warn a member or view warnings |
| `/purge` | Bulk delete messages |
| `/lock` / `/unlock` | Lock or unlock a channel |
| `/lockdown` / `/unlockdown` | Lock or unlock all channels |
| `/slowmode` | Set channel slowmode |
| `/nickname` | Change a member's nickname |
| `/addrole` / `/removerole` | Manage member roles |
| `/roleinfo` | View role information |
| `/unban` | Unban a user |
| `/snipe` | View the last deleted message in a channel |

---

### 🎈 Fun

All under `/fun <subcommand>`:

| Subcommand | Description |
|---|---|
| `8ball` | Ask the magic 8-ball |
| `coinflip` | Flip a coin |
| `roll` | Roll a dice |
| `rps` | Rock paper scissors |
| `rate` | Rate something out of 10 |
| `ship` | Calculate love compatibility |
| `wouldyourather` | Random would you rather |
| `truth` | Random truth question |
| `dare` | Random dare challenge |
| `predict` | Get an absurd future prediction |
| `roast` | Get gently roasted |
| `compliment` | Receive a suspiciously genuine compliment |
| `reverse` | Reverse your text |
| `slots` | Spin the slot machine |
| `howdumb` | Measure your dumbness via vibes |

---

### 🎲 Games

| Command | Description |
|---|---|
| `/tictactoe` | Play tic-tac-toe |
| `/trivia` | Answer random trivia questions |
| `/guess` | Guess a number game |
| `/dice` | Roll customizable dice with sides |

---

### 💬 Social

Powered by Giphy API for animated GIFs:

| Command | Description |
|---|---|
| `/hug` | Hug someone |
| `/kiss` | Kiss someone |
| `/pat` | Pat someone |
| `/slap` | Slap someone |
| `/highfive` | High five someone |
| `/poke` | Poke someone |
| `/wave` | Wave at someone |
| `/dance` | Dance with someone |
| `/cry` | Cry |
| `/laugh` | Laugh |

---

### 🖼️ Image

All under `/image <subcommand>`:

**Text Effects:** `mock`, `bubble`, `vaporwave`, `zalgo`, `emojify`, `clap`, `ascii`

**Animals:** `dog`, `cat`, `fox`, `duck`, `bird`, `shibe`

**Fun / Misc:** `meme`, `waifu`, `inspiro`, `joke`, `fact`

---

### 💰 Economy

| Command | Description |
|---|---|
| `/balance` | View wallet and bank balance |
| `/daily` | Claim daily reward |
| `/work` | Work for coins |
| `/deposit` / `/withdraw` | Manage your bank |
| `/transfer` | Send coins to another user |
| `/rob` | Rob another user |
| `/gamble` | Gamble coins |
| `/shop` / `/buy` | Browse and buy from the shop |
| `/shopmanage` | Admin shop management |
| `/inventory` | View your inventory |
| `/leaderboard` | Server economy leaderboard |

---

### 🎵 Music

Powered by Riffy + Lavalink:

| Command | Description |
|---|---|
| `/play` | Play a song or playlist |
| `/skip` | Skip the current track |
| `/stop` | Stop playback and clear queue |
| `/queue` | View the current queue |
| `/nowplaying` | Show the now playing card |
| `/loop` | Toggle loop mode |
| `/volume` | Adjust playback volume |
| `/lyrics` | Fetch song lyrics |

---

### ⭐ Levelling

| Command | Description |
|---|---|
| `/level setup` | Configure levelling system |
| `/level toggle` | Enable/disable levelling |
| `/rank` | View your rank card |
| `/leaderboard` | View XP leaderboard |
| `/level setxp` | Manually set XP |
| `/level rewards` | Configure level-up role rewards |

---

### 📨 Invites

| Command | Description |
|---|---|
| `/invites` | View your invite stats |
| `/invitetop` | Server invite leaderboard |
| `/invitesetup` | Configure invite tracking |

---

### 🎉 Giveaway

| Command | Description |
|---|---|
| `/giveaway start` | Start a giveaway |
| `/giveaway end` | End a giveaway early |
| `/giveaway reroll` | Reroll giveaway winners |

---

### 🤖 Automod

| Command | Description |
|---|---|
| `/automod setup` | Configure automod rules |
| `/automod badwords` | Manage bad word filter |
| `/automod antilink` | Configure link filtering |
| `/automod antispam` | Configure spam detection |
| `/automod anticaps` | Configure caps filtering |
| `/automod antiinvite` | Block Discord invite links |
| `/automod ignore` | Ignore channels or roles |

---

### 🎫 Tickets

| Command | Description |
|---|---|
| `/ticket setup` | Configure ticket system |
| `/ticket panel` | Post a ticket creation panel |
| `/ticket close` | Close a ticket |
| `/ticket add` / `/ticket remove` | Add or remove users from ticket |

---

### 👋 Welcome

| Command | Description |
|---|---|
| `/welcome setup` | Configure welcome channel and card |
| `/welcome toggle` | Enable/disable welcome messages |
| `/welcome test` | Preview the welcome card |

---

## Notable Features

### Dynamic Help Menu

- Canvas banner generated from bot avatar with live server/user stats
- Category overview with emoji labels and command counts
- `BotName | Help Menu` placeholder in the select menu
- Separator dividers for clean visual structure
- Invite, support, and vote link buttons
- Paginated command listing per category

### AFK System

- Set AFK with optional reason and scope (`guild` or `global`)
- Auto-detects return from AFK when the user sends a message
- Pinging an AFK user shows how long they've been away and their reason
- Funny randomised messages for all states

### Snipe Command

- Caches the last deleted message per channel in-memory
- Shows author, original timestamp, deletion time, content, and any attached image

### ModMail

- Users DM the bot to open a thread in a dedicated category
- Staff reply with `!<message>` inside the thread channel
- Attachment support in both directions
- Clean thread creation and closing flow

### Content Notifiers

- YouTube: RSS feed polling
- Twitch: Helix API polling for live status
- Custom alert message placeholders: `{creator}`, `{title}`, `{link}`

### Reaction Roles

- Multiple emoji-role pairs per message
- Works on old/uncached messages via Discord Partials
- Optional panel creation command

---

## Database Models

| Model | Purpose |
|---|---|
| `Guild` | Server configuration |
| `User` | Economy data |
| `Warning` | Moderation warnings |
| `LevelConfig` | Levelling settings |
| `UserLevel` | Per-user XP/level data |
| `TicketConfig` | Ticket system config |
| `WelcomeConfig` | Welcome system config |
| `StickyMessage` | Sticky message state |
| `ModmailConfig` | Modmail config |
| `ModmailThread` | Active modmail threads |
| `BoosterConfig` | Boost notification config |
| `NotifierConfig` | YouTube/Twitch notifier config |
| `SuggestionConfig` | Suggestion system config |
| `ReactionRole` | Reaction role assignments |
| `AutoModConfig` | Automod rules |
| `InviteConfig` | Invite tracking data |
| `GiveawayConfig` | Active giveaway data |

---

## Development Notes

### Adding a new command

1. Create a file in the correct category folder inside `src/commands/`
2. Export: `category`, `name`, `description`, `data` (SlashCommandBuilder), `executePrefix`, `executeSlash`
3. Use Components V2 (`ContainerBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`, `MediaGalleryBuilder`) for all responses
4. Restart the bot or use `npm run dev` for auto-reload

### Adding subcommands to an existing group

For categories like `/fun`, `/image` — add a new `.addSubcommand()` entry to the `data` builder and a matching `case` in the handler switch.

### Using GIFs in social commands

```javascript
const { getGiphyGif } = require('../../utils/giphy');
const gifUrl = await getGiphyGif('hug');

const gallery = new MediaGalleryBuilder().addItems(
  new MediaGalleryItemBuilder().setURL(gifUrl)
);
```

---

## Music Requirements

Requires a running Lavalink-compatible node configured in `src/index.js`. The bot must have:

- Connect to voice channels
- Speak in voice channels
- Send messages in the bound text channel

---

## API Integrations

| API | Used For |
|---|---|
| Giphy | Animated GIFs in social commands |
| Lavalink / Riffy | Music playback |
| MongoDB | All persistent data |
| YouTube RSS | Content notifier polling |
| Twitch Helix | Stream live detection |
| dog.ceo | Random dog images |
| thecatapi | Random cat images |
| randomfox.ca | Random fox images |
| random-d.uk | Random duck images |
| shibe.online | Random shibe/bird images |
| meme-api.com | Random Reddit memes |
| waifu.pics | SFW waifu images |
| inspirobot.me | AI inspirational posters |
| v2.jokeapi.dev | Random jokes |
| uselessfacts.jsph.pl | Random useless facts |

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

- **Non-Commercial**: You may not sell, sublicense, or monetize this software in any form.
- **Attribution**: You must give appropriate credit to **Rahul ([@rahulxdevv](https://github.com/rahulxdevv))**, provide a link to the license, and indicate if changes were made.
- See the full [LICENSE](LICENSE) file for complete details.