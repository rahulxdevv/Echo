const {
  SlashCommandBuilder,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const { replyError } = require('../../utils/respond');
const Backup = require('../../models/Backup');
const { createBackup, loadBackup } = require('../../utils/backup');
const emojis = require('../../utils/emojis');
const axios = require('axios');
const dns = require('dns').promises;

module.exports = {
  category: 'Tools',
  name: 'tools',
  description: 'Utility tools for various tasks',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('tools')
    .setDescription('Utility tools for various tasks')
    .addSubcommand(subcommand =>
      subcommand
        .setName('tts')
        .setDescription('Convert text to speech')
        .addStringOption(option =>
          option
            .setName('text')
            .setDescription('Text to convert to speech')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mcstatus')
        .setDescription('Check Minecraft server status')
        .addStringOption(option =>
          option
            .setName('server')
            .setDescription('Server address (e.g., hypixel.net)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('iplookup')
        .setDescription('Lookup IP address information')
        .addStringOption(option =>
          option
            .setName('ip')
            .setDescription('IP address to lookup')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('docs')
        .setDescription('Search documentation')
        .addStringOption(option =>
          option
            .setName('library')
            .setDescription('Library to search')
            .setRequired(true)
            .addChoices(
              { name: 'Discord.js', value: 'discordjs' },
              { name: 'Node.js', value: 'nodejs' },
              { name: 'MDN', value: 'mdn' }
            )
        )
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Search query')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('calculator')
        .setDescription('Calculate mathematical expressions')
        .addStringOption(option =>
          option
            .setName('expression')
            .setDescription('Mathematical expression (e.g., 2 + 2 * 3)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('password')
        .setDescription('Generate a secure random password')
        .addIntegerOption(option =>
          option
            .setName('length')
            .setDescription('Password length (default: 16)')
            .setMinValue(8)
            .setMaxValue(128)
        )
        .addBooleanOption(option =>
          option
            .setName('symbols')
            .setDescription('Include symbols (default: true)')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('weather')
        .setDescription('Get weather information')
        .addStringOption(option =>
          option
            .setName('location')
            .setDescription('City name or location')
            .setRequired(true)
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('backup')
        .setDescription('Server backup and cloning tools')
        .addSubcommand(sub =>
          sub
            .setName('create')
            .setDescription('Create a backup of the current server')
        )
        .addSubcommand(sub =>
          sub
            .setName('load')
            .setDescription('Load a backup into the current server (DESTRUCTIVE)')
            .addStringOption(opt => opt.setName('id').setDescription('The backup ID').setRequired(true))
        )
        .addSubcommand(sub =>
          sub
            .setName('list')
            .setDescription('List your saved backups')
        )
        .addSubcommand(sub =>
          sub
            .setName('info')
            .setDescription('Show info about a backup')
            .addStringOption(opt => opt.setName('id').setDescription('The backup ID').setRequired(true))
        )
    ),

  async executeSlash(interaction, client) {
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'backup') {
      return this.handleBackup(interaction, client);
    }

    switch (subcommand) {
      case 'tts':
        await this.handleTTS(interaction, client);
        break;
      case 'mcstatus':
        await this.handleMCStatus(interaction, client);
        break;
      case 'iplookup':
        await this.handleIPLookup(interaction, client);
        break;
      case 'docs':
        await this.handleDocs(interaction, client);
        break;
      case 'calculator':
        await this.handleCalculator(interaction, client);
        break;
      case 'password':
        await this.handlePassword(interaction, client);
        break;
      case 'weather':
        await this.handleWeather(interaction, client);
        break;
      default:
        await replyError(interaction, 'Unknown subcommand.');
    }
  },

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'backup') {
      return this.handleBackupPrefix(message, args.slice(1), client);
    }

    if (!subcommand) {
      return replyError(message, 'Please specify a subcommand: tts, mcstatus, iplookup, docs, calculator, password, weather');
    }

    switch (subcommand) {
      case 'tts':
        await this.handleTTSPrefix(message, args.slice(1), client);
        break;
      case 'mcstatus':
        await this.handleMCStatusPrefix(message, args.slice(1), client);
        break;
      case 'iplookup':
        await this.handleIPLookupPrefix(message, args.slice(1), client);
        break;
      case 'docs':
        await this.handleDocsPrefix(message, args.slice(1), client);
        break;
      case 'calculator':
      case 'calc':
        await this.handleCalculatorPrefix(message, args.slice(1), client);
        break;
      case 'password':
      case 'pass':
        await this.handlePasswordPrefix(message, args.slice(1), client);
        break;
      case 'weather':
        await this.handleWeatherPrefix(message, args.slice(1), client);
        break;
      default:
        await replyError(message, 'Unknown subcommand. Available: tts, mcstatus, iplookup, docs, calculator, password, weather');
    }
  },

  async handleTTS(interaction, client) {
    const text = interaction.options.getString('text');

    if (text.length > 200) {
      return replyError(interaction, 'Text must be 200 characters or less.');
    }

    try {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Text to Speech**\n\n${text}`)
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files: [{
          attachment: ttsUrl,
          name: 'tts.mp3'
        }]
      });
    } catch (error) {
      console.error('TTS error:', error);
      await replyError(interaction, 'Failed to generate text-to-speech.');
    }
  },

  async handleTTSPrefix(message, args, client) {
    const text = args.join(' ');

    if (!text) {
      return replyError(message, 'Please provide text to convert to speech.');
    }

    if (text.length > 200) {
      return replyError(message, 'Text must be 200 characters or less.');
    }

    try {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Text to Speech**\n\n${text}`)
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        files: [{
          attachment: ttsUrl,
          name: 'tts.mp3'
        }]
      });
    } catch (error) {
      console.error('TTS error:', error);
      await replyError(message, 'Failed to generate text-to-speech.');
    }
  },

  async handleMCStatus(interaction, client) {
    const server = interaction.options.getString('server');

    await interaction.deferReply();

    try {
      const response = await axios.get(`https://api.mcsrvstat.us/3/${server}`);
      const data = response.data;

      if (!data.online) {
        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Minecraft Server Status**\n\nServer: ${server}\nStatus: Offline`)
              )
          ]
        });
      }

      const content = [
        `**Minecraft Server Status**\n`,
        `Server: ${server}`,
        `Status: Online`,
        `Players: ${data.players.online}/${data.players.max}`,
        `Version: ${data.version || 'Unknown'}`,
        data.motd?.clean ? `\nMOTD:\n${data.motd.clean.join('\n')}` : ''
      ].filter(Boolean).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('MC Status error:', error);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('Failed to fetch server status. Please check the server address.')
            )
        ]
      });
    }
  },

  async handleMCStatusPrefix(message, args, client) {
    const server = args[0];

    if (!server) {
      return replyError(message, 'Please provide a server address.');
    }

    const msg = await message.reply('Checking server status...');

    try {
      const response = await axios.get(`https://api.mcsrvstat.us/3/${server}`);
      const data = response.data;

      if (!data.online) {
        return msg.edit({
          content: '',
          flags: MessageFlags.IsComponentsV2,
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Minecraft Server Status**\n\nServer: ${server}\nStatus: Offline`)
              )
          ]
        });
      }

      const content = [
        `**Minecraft Server Status**\n`,
        `Server: ${server}`,
        `Status: Online`,
        `Players: ${data.players.online}/${data.players.max}`,
        `Version: ${data.version || 'Unknown'}`,
        data.motd?.clean ? `\nMOTD:\n${data.motd.clean.join('\n')}` : ''
      ].filter(Boolean).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('MC Status error:', error);
      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('Failed to fetch server status. Please check the server address.')
            )
        ]
      });
    }
  },

  async handleIPLookup(interaction, client) {
    const ip = interaction.options.getString('ip');

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return replyError(interaction, 'Please provide a valid IPv4 address.');
    }

    await interaction.deferReply();

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      if (data.status === 'fail') {
        return interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Failed to lookup IP address. It may be invalid or private.')
              )
          ]
        });
      }

      const content = [
        `**IP Lookup**\n`,
        `IP: ${data.query}`,
        `Country: ${data.country} (${data.countryCode})`,
        `Region: ${data.regionName}`,
        `City: ${data.city}`,
        `ZIP: ${data.zip || 'N/A'}`,
        `ISP: ${data.isp}`,
        `Organization: ${data.org}`,
        `Timezone: ${data.timezone}`
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('IP Lookup error:', error);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('Failed to lookup IP address.')
            )
        ]
      });
    }
  },

  async handleIPLookupPrefix(message, args, client) {
    const ip = args[0];

    if (!ip) {
      return replyError(message, 'Please provide an IP address.');
    }

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return replyError(message, 'Please provide a valid IPv4 address.');
    }

    const msg = await message.reply('Looking up IP address...');

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      if (data.status === 'fail') {
        return msg.edit({
          content: '',
          flags: MessageFlags.IsComponentsV2,
          components: [
            new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Failed to lookup IP address. It may be invalid or private.')
              )
          ]
        });
      }

      const content = [
        `**IP Lookup**\n`,
        `IP: ${data.query}`,
        `Country: ${data.country} (${data.countryCode})`,
        `Region: ${data.regionName}`,
        `City: ${data.city}`,
        `ZIP: ${data.zip || 'N/A'}`,
        `ISP: ${data.isp}`,
        `Organization: ${data.org}`,
        `Timezone: ${data.timezone}`
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('IP Lookup error:', error);
      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('Failed to lookup IP address.')
            )
        ]
      });
    }
  },

  async handleDocs(interaction, client) {
    const library = interaction.options.getString('library');
    const query = interaction.options.getString('query');

    let url;
    switch (library) {
      case 'discordjs':
        url = `https://discord.js.org/#/docs/discord.js/main/search?query=${encodeURIComponent(query)}`;
        break;
      case 'nodejs':
        url = `https://nodejs.org/api/all.html#all_${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '_'))}`;
        break;
      case 'mdn':
        url = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`;
        break;
    }

    const content = [
      `**Documentation Search**\n`,
      `Library: ${library === 'discordjs' ? 'Discord.js' : library === 'nodejs' ? 'Node.js' : 'MDN'}`,
      `Query: ${query}`,
      `\n[View Documentation](${url})`
    ].join('\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async handleDocsPrefix(message, args, client) {
    if (args.length < 2) {
      return replyError(message, 'Usage: tools docs <library> <query>\nLibraries: discordjs, nodejs, mdn');
    }

    const library = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    if (!['discordjs', 'nodejs', 'mdn'].includes(library)) {
      return replyError(message, 'Invalid library. Choose from: discordjs, nodejs, mdn');
    }

    let url;
    switch (library) {
      case 'discordjs':
        url = `https://discord.js.org/#/docs/discord.js/main/search?query=${encodeURIComponent(query)}`;
        break;
      case 'nodejs':
        url = `https://nodejs.org/api/all.html#all_${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '_'))}`;
        break;
      case 'mdn':
        url = `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`;
        break;
    }

    const content = [
      `**Documentation Search**\n`,
      `Library: ${library === 'discordjs' ? 'Discord.js' : library === 'nodejs' ? 'Node.js' : 'MDN'}`,
      `Query: ${query}`,
      `\n[View Documentation](${url})`
    ].join('\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  },

  async handleCalculator(interaction, client) {
    const expression = interaction.options.getString('expression');

    try {
      const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');

      if (!sanitized || sanitized !== expression) {
        return replyError(interaction, 'Invalid expression. Only numbers and operators (+, -, *, /, parentheses) are allowed.');
      }

      const result = Function('"use strict"; return (' + sanitized + ')')();

      if (!isFinite(result)) {
        return replyError(interaction, 'Result is not a finite number.');
      }

      const content = [
        `**Calculator**\n`,
        `Expression: \`${expression}\``,
        `Result: \`${result}\``
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Calculator error:', error);
      await replyError(interaction, 'Invalid mathematical expression.');
    }
  },

  async handleCalculatorPrefix(message, args, client) {
    const expression = args.join(' ');

    if (!expression) {
      return replyError(message, 'Please provide a mathematical expression.');
    }

    try {
      const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');

      if (!sanitized || sanitized !== expression) {
        return replyError(message, 'Invalid expression. Only numbers and operators (+, -, *, /, parentheses) are allowed.');
      }

      const result = Function('"use strict"; return (' + sanitized + ')')();

      if (!isFinite(result)) {
        return replyError(message, 'Result is not a finite number.');
      }

      const content = [
        `**Calculator**\n`,
        `Expression: \`${expression}\``,
        `Result: \`${result}\``
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Calculator error:', error);
      await replyError(message, 'Invalid mathematical expression.');
    }
  },

  async handlePassword(interaction, client) {
    const length = interaction.options.getInteger('length') || 16;
    const includeSymbols = interaction.options.getBoolean('symbols') ?? true;

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const content = [
      `**Password Generator**\n`,
      `Length: ${length}`,
      `Symbols: ${includeSymbols ? 'Yes' : 'No'}`,
      `\nGenerated Password:\n\`${password}\``,
      `\n*This message is only visible to you.*`
    ].join('\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container]
    });
  },

  async handlePasswordPrefix(message, args, client) {
    const length = parseInt(args[0]) || 16;
    const includeSymbols = args[1] !== 'false';

    if (length < 8 || length > 128) {
      return replyError(message, 'Password length must be between 8 and 128.');
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    try {
      const content = [
        `**Password Generator**\n`,
        `Length: ${length}`,
        `Symbols: ${includeSymbols ? 'Yes' : 'No'}`,
        `\nGenerated Password:\n\`${password}\``
      ].join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await message.author.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      await message.reply('Password sent to your DMs.');
    } catch (error) {
      await replyError(message, 'Failed to send password. Please enable DMs from server members.');
    }
  },

  async handleWeather(interaction, client) {
    const location = interaction.options.getString('location');

    if (!process.env.WEATHER_API_KEY) {
      return replyError(interaction, 'Weather API key not configured. Please add WEATHER_API_KEY to .env file.\nGet a free key at: https://openweathermap.org/api');
    }

    await interaction.deferReply();

    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: location,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric'
        }
      });

      const data = response.data;

      const content = [
        `**Weather Information**\n`,
        `Location: ${data.name}, ${data.sys.country}`,
        `Temperature: ${data.main.temp}°C (Feels like: ${data.main.feels_like}°C)`,
        `Condition: ${data.weather[0].main} - ${data.weather[0].description}`,
        `Humidity: ${data.main.humidity}%`,
        `Wind Speed: ${data.wind.speed} m/s`,
        `Pressure: ${data.main.pressure} hPa`,
        data.clouds ? `Cloud Coverage: ${data.clouds.all}%` : ''
      ].filter(Boolean).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Weather error:', error);
      let errorMsg = 'Failed to fetch weather data.';

      if (error.response?.status === 404) {
        errorMsg = 'Location not found. Please check the spelling.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Invalid API key. Please check your WEATHER_API_KEY in .env file.';
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(errorMsg)
            )
        ]
      });
    }
  },

  async handleWeatherPrefix(message, args, client) {
    const location = args.join(' ');

    if (!location) {
      return replyError(message, 'Please provide a location.');
    }

    if (!process.env.WEATHER_API_KEY) {
      return replyError(message, 'Weather API key not configured. Please add WEATHER_API_KEY to .env file.\nGet a free key at: https://openweathermap.org/api');
    }

    const msg = await message.reply('Fetching weather data...');

    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: location,
          appid: process.env.WEATHER_API_KEY,
          units: 'metric'
        }
      });

      const data = response.data;

      const content = [
        `**Weather Information**\n`,
        `Location: ${data.name}, ${data.sys.country}`,
        `Temperature: ${data.main.temp}°C (Feels like: ${data.main.feels_like}°C)`,
        `Condition: ${data.weather[0].main} - ${data.weather[0].description}`,
        `Humidity: ${data.main.humidity}%`,
        `Wind Speed: ${data.wind.speed} m/s`,
        `Pressure: ${data.main.pressure} hPa`,
        data.clouds ? `Cloud Coverage: ${data.clouds.all}%` : ''
      ].filter(Boolean).join('\n');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(content)
        );

      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    } catch (error) {
      console.error('Weather error:', error);
      let errorMsg = 'Failed to fetch weather data.';

      if (error.response?.status === 404) {
        errorMsg = 'Location not found. Please check the spelling.';
      } else if (error.response?.status === 401) {
        errorMsg = 'Invalid API key. Please check your WEATHER_API_KEY in .env file.';
      }

      await msg.edit({
        content: '',
        flags: MessageFlags.IsComponentsV2,
        components: [
          new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(errorMsg)
            )
        ]
      });
    }
  },

  async handleBackup(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(interaction, 'You need Administrator permission to use backup tools.');
    }

    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const data = await createBackup(interaction.guild);
        const backupId = Math.random().toString(36).substring(2, 10).toUpperCase();

        await Backup.create({
          backupId,
          ownerId: userId,
          guildName: interaction.guild.name,
          guildIcon: interaction.guild.iconURL(),
          data: JSON.stringify(data)
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${emojis.status.success} Backup Created\n\n**ID:** \`${backupId}\`\n**Server:** ${interaction.guild.name}\n\n*Keep this ID safe! You can use it to clone this server elsewhere.*`)
          );

        await interaction.editReply({ components: [container] });
      } catch (err) {
        console.error(err);
        await interaction.editReply({ content: 'Failed to create backup.' });
      }
    } else if (sub === 'load') {
      const id = interaction.options.getString('id');
      const backup = await Backup.findOne({ backupId: id });
      if (!backup) return replyError(interaction, 'Backup not found.');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`⚠️ **WARNING:** This will delete **ALL** channels and roles in this server and replace them with the backup.\n\nType \`CONFIRM\` in the chat to proceed.`)
        );

      await interaction.reply({
        components: [container],
        ephemeral: true
      });

      const filter = m => m.author.id === userId && m.content === 'CONFIRM';
      const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async () => {
        try {
          const data = JSON.parse(backup.data);
          await loadBackup(interaction.guild, data);
        } catch (err) {
          console.error(err);
        }
      });
    } else if (sub === 'list') {
      const backups = await Backup.find({ ownerId: userId });
      if (backups.length === 0) return interaction.reply({ content: 'You have no saved backups.', ephemeral: true });

      const list = backups.map(b => `- \`${b.backupId}\` | **${b.guildName}** (${b.createdAt.toLocaleDateString()})`).join('\n');
      const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Your Backups\n\n${list}`));
      await interaction.reply({ components: [container], ephemeral: true });
    } else if (sub === 'info') {
      const id = interaction.options.getString('id');
      const backup = await Backup.findOne({ backupId: id });
      if (!backup) return replyError(interaction, 'Backup not found.');

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Backup Info\n\n**ID:** \`${backup.backupId}\`\n**Source Server:** ${backup.guildName}\n**Created:** ${backup.createdAt.toLocaleString()}\n**Owner:** <@${backup.ownerId}>`)
        );
      await interaction.reply({ components: [container], ephemeral: true });
    }
  },

  async handleBackupPrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(message, 'You need Administrator permission to use backup tools.');
    }

    if (sub === 'create') {
      const msg = await message.reply('⏳ Creating backup...');
      try {
        const data = await createBackup(message.guild);
        const backupId = Math.random().toString(36).substring(2, 10).toUpperCase();

        await Backup.create({
          backupId,
          ownerId: userId,
          guildName: message.guild.name,
          guildIcon: message.guild.iconURL(),
          data: JSON.stringify(data)
        });

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${emojis.status.success} Backup Created\n\n**ID:** \`${backupId}\`\n**Server:** ${message.guild.name}\n\n*Keep this ID safe!*`)
          );

        await msg.edit({ content: '', components: [container] });
      } catch (err) {
        console.error(err);
        await msg.edit('Failed to create backup.');
      }
    } else if (sub === 'load') {
      const id = args[1];
      if (!id) return replyError(message, 'Please provide a backup ID.');
      const backup = await Backup.findOne({ backupId: id });
      if (!backup) return replyError(message, 'Backup not found.');

      await message.reply(`⚠️ **WARNING:** This will delete **ALL** channels and roles. Type \`CONFIRM\` to proceed.`);

      const filter = m => m.author.id === userId && m.content === 'CONFIRM';
      const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async () => {
        try {
          const data = JSON.parse(backup.data);
          await loadBackup(message.guild, data);
        } catch (err) {
          console.error(err);
        }
      });
    } else if (sub === 'list') {
      const backups = await Backup.find({ ownerId: userId });
      const list = backups.map(b => `- \`${b.backupId}\` | **${b.guildName}**`).join('\n') || 'No backups found.';
      const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Your Backups\n\n${list}`));
      await message.reply({ components: [container] });
    }
  }
};
