const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require('discord.js');
const axios = require('axios');
const emojis = require('../../utils/emojis');

// ─── Text Transform Helpers ────────────────────────────────────────────────────

function toMock(text) {
  return text.split('').map((c, i) => c.match(/[a-zA-Z]/) ? (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()) : c).join('');
}

function toBubble(text) {
  const m = { a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',k:'ⓚ',l:'ⓛ',m:'ⓜ',n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ',A:'Ⓐ',B:'Ⓑ',C:'Ⓒ',D:'Ⓓ',E:'Ⓔ',F:'Ⓕ',G:'Ⓖ',H:'Ⓗ',I:'Ⓘ',J:'Ⓙ',K:'Ⓚ',L:'Ⓛ',M:'Ⓜ',N:'Ⓝ',O:'Ⓞ',P:'Ⓟ',Q:'Ⓠ',R:'Ⓡ',S:'Ⓢ',T:'Ⓣ',U:'Ⓤ',V:'Ⓥ',W:'Ⓦ',X:'Ⓧ',Y:'Ⓨ',Z:'Ⓩ','0':'⓪','1':'①','2':'②','3':'③','4':'④','5':'⑤','6':'⑥','7':'⑦','8':'⑧','9':'⑨' };
  return text.split('').map(c => m[c] || c).join('');
}

function toVaporwave(text) {
  return text.split('').map(c => { const code = c.charCodeAt(0); return (code >= 33 && code <= 126) ? String.fromCharCode(code + 65248) : c; }).join('');
}

function toZalgo(text) {
  const zc = ['̀','́','̂','̃','̄','̅','̆','̇','̈','̉','̊','̋','̌','̍','̎','̏','̐','̑','̒','̓','̔','̕','̖','̗','̘','̙','̚','̛','̜','̝','̞','̟','̠','̡','̢','̣','̤','̥','̦','̧'];
  return text.split('').map(c => { if (c === ' ') return c; let r = c; for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) r += zc[Math.floor(Math.random() * zc.length)]; return r; }).join('');
}

function toEmojify(text) {
  const nums = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  return text.toLowerCase().split('').map(c => { if (c >= 'a' && c <= 'z') return `:regional_indicator_${c}:`; if (c >= '0' && c <= '9') return `:${nums[parseInt(c)]}:`; if (c === ' ') return '   '; return c; }).join('');
}

function toAscii(text) {
  const L = { A:['  A  ',' A A ','AAAAA','A   A','A   A'],B:['BBBB ','B   B','BBBB ','B   B','BBBB '],C:[' CCC ','C   C','C    ','C   C',' CCC '],D:['DDDD ','D   D','D   D','D   D','DDDD '],E:['EEEEE','E    ','EEEE ','E    ','EEEEE'],F:['FFFFF','F    ','FFFF ','F    ','F    '],G:[' GGG ','G    ','G  GG','G   G',' GGG '],H:['H   H','H   H','HHHHH','H   H','H   H'],I:['IIIII','  I  ','  I  ','  I  ','IIIII'],J:['JJJJJ','    J','    J','J   J',' JJJ '],K:['K   K','K  K ','KKK  ','K  K ','K   K'],L:['L    ','L    ','L    ','L    ','LLLLL'],M:['M   M','MM MM','M M M','M   M','M   M'],N:['N   N','NN  N','N N N','N  NN','N   N'],O:[' OOO ','O   O','O   O','O   O',' OOO '],P:['PPPP ','P   P','PPPP ','P    ','P    '],Q:[' QQQ ','Q   Q','Q   Q','Q  Q ',' QQ Q'],R:['RRRR ','R   R','RRRR ','R  R ','R   R'],S:[' SSS ','S    ',' SSS ','    S','SSSS '],T:['TTTTT','  T  ','  T  ','  T  ','  T  '],U:['U   U','U   U','U   U','U   U',' UUU '],V:['V   V','V   V','V   V',' V V ','  V  '],W:['W   W','W   W','W W W','WW WW','W   W'],X:['X   X',' X X ','  X  ',' X X ','X   X'],Y:['Y   Y',' Y Y ','  Y  ','  Y  ','  Y  '],Z:['ZZZZZ','   Z ','  Z  ',' Z   ','ZZZZZ'],' ':['     ','     ','     ','     ','     '],'0':[' 000 ','0  00','0 0 0','00  0',' 000 '],'1':['  1  ',' 11  ','  1  ','  1  ','11111'],'2':[' 222 ','2   2','   2 ','  2  ','22222'],'3':[' 333 ','3   3','  33 ','3   3',' 333 '],'4':['4   4','4   4','44444','    4','    4'],'5':['55555','5    ','5555 ','    5','5555 '],'6':[' 666 ','6    ','6666 ','6   6',' 666 '],'7':['77777','    7','   7 ','  7  ',' 7   '],'8':[' 888 ','8   8',' 888 ','8   8',' 888 '],'9':[' 999 ','9   9',' 9999','    9',' 999 '] };
  const lines = ['','','','',''];
  for (const c of text.toUpperCase().substring(0, 10)) { const l = L[c] || L[' ']; for (let i = 0; i < 5; i++) lines[i] += l[i] + ' '; }
  return lines.join('\n');
}

// ─── Payload Builders ─────────────────────────────────────────────────────────

function textPayload(title, original, result) {
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  const content = `${title}\n\n**Original:** ${original}\n\n**Result:** ${result}`;
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content)).addSeparatorComponents(sep)],
  };
}

function imagePayload(imageUrl, caption) {
  const gallery = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(imageUrl));
  const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder().addMediaGalleryComponents(gallery).addSeparatorComponents(sep).addTextDisplayComponents(new TextDisplayBuilder().setContent(caption))],
  };
}

// ─── Command Definition ────────────────────────────────────────────────────────

module.exports = {
  category: 'Image',
  name: 'image',
  description: 'Image, text effects and fun media commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Image, text effects and fun media commands')
    // Text effects
    .addSubcommand(s => s.setName('mock').setDescription('Convert text to mocking spongebob case').addStringOption(o => o.setName('text').setDescription('Text to mock').setRequired(true)))
    .addSubcommand(s => s.setName('bubble').setDescription('Convert text to bubble letters').addStringOption(o => o.setName('text').setDescription('Text to convert').setRequired(true)))
    .addSubcommand(s => s.setName('vaporwave').setDescription('Convert text to vaporwave aesthetic').addStringOption(o => o.setName('text').setDescription('Text to convert').setRequired(true)))
    .addSubcommand(s => s.setName('zalgo').setDescription('Convert text to creepy zalgo/glitch text').addStringOption(o => o.setName('text').setDescription('Text to convert').setRequired(true)))
    .addSubcommand(s => s.setName('emojify').setDescription('Convert text to regional indicator emojis').addStringOption(o => o.setName('text').setDescription('Text to emojify').setRequired(true)))
    .addSubcommand(s => s.setName('clap').setDescription('Add clap emoji between every word').addStringOption(o => o.setName('text').setDescription('Text to clap').setRequired(true)))
    .addSubcommand(s => s.setName('ascii').setDescription('Convert text to block ASCII art').addStringOption(o => o.setName('text').setDescription('Text to convert (max 10 chars)').setRequired(true)))
    // Animal images
    .addSubcommand(s => s.setName('dog').setDescription('Fetch a random dog image'))
    .addSubcommand(s => s.setName('cat').setDescription('Fetch a random cat image'))
    .addSubcommand(s => s.setName('fox').setDescription('Fetch a random fox image'))
    .addSubcommand(s => s.setName('duck').setDescription('Fetch a random duck image'))
    .addSubcommand(s => s.setName('bird').setDescription('Fetch a random bird image'))
    .addSubcommand(s => s.setName('shibe').setDescription('Fetch a random shiba inu image'))
    // Fun & misc
    .addSubcommand(s => s.setName('meme').setDescription('Fetch a random meme from Reddit'))
    .addSubcommand(s => s.setName('waifu').setDescription('Fetch a random waifu image').addStringOption(o => o.setName('type').setDescription('Waifu type').addChoices({ name: 'Waifu', value: 'waifu' },{ name: 'Neko', value: 'neko' },{ name: 'Shinobu', value: 'shinobu' },{ name: 'Megumin', value: 'megumin' },{ name: 'Awoo', value: 'awoo' })))
    .addSubcommand(s => s.setName('inspiro').setDescription('Get a random AI-generated inspirational poster'))
    .addSubcommand(s => s.setName('joke').setDescription('Get a random joke').addStringOption(o => o.setName('type').setDescription('Joke type').addChoices({ name: 'Any', value: 'Any' },{ name: 'Programming', value: 'Programming' },{ name: 'Pun', value: 'Pun' },{ name: 'Spooky', value: 'Spooky' })))
    .addSubcommand(s => s.setName('fact').setDescription('Get a random useless fact')),

  async executePrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();
    const text = args.slice(1).join(' ');

    if (!sub) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${emojis.categories.image} **Image Commands**\n\n**Text Effects:** \`mock\`, \`bubble\`, \`vaporwave\`, \`zalgo\`, \`emojify\`, \`clap\`, \`ascii\`\n**Animals:** \`dog\`, \`cat\`, \`fox\`, \`duck\`, \`bird\`, \`shibe\`\n**Fun:** \`meme\`, \`waifu\`, \`inspiro\`, \`joke\`, \`fact\`\n\n*Usage: \`${client.config.prefix}image <subcommand> [text]\`*`
        ))],
      });
    }

    return handleSubcommand(sub, { text, type: args[1] }, message, null);
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const text = interaction.options.getString('text') || '';
    const type = interaction.options.getString('type') || null;
    await interaction.deferReply();
    return handleSubcommand(sub, { text, type }, null, interaction);
  },
};

// ─── Subcommand Router ────────────────────────────────────────────────────────

async function handleSubcommand(sub, { text, type }, message, interaction) {
  const reply = async (payload) => {
    if (interaction) return interaction.editReply(payload);
    return message.reply(payload);
  };

  try {
    switch (sub) {
      // ── Text effects ──────────────────────────────────────────────────────
      case 'mock':
        return reply(textPayload(`${emojis.media.clown} **Mocking Text**`, text, toMock(text)));
      case 'bubble':
        return reply(textPayload(`${emojis.media.bubble} **Bubble Text**`, text, toBubble(text)));
      case 'vaporwave':
        return reply(textPayload(`${emojis.media.flower} **Vaporwave**`, text, toVaporwave(text)));
      case 'zalgo':
        return reply(textPayload(`${emojis.status.ghost} **Zalgo Text**`, text, toZalgo(text)));
      case 'emojify':
        return reply(textPayload(`${emojis.media.emoji} **Emojified**`, text, toEmojify(text)));
      case 'clap':
        return reply(textPayload(`${emojis.media.clap} **Clap Text**`, text, text.split(' ').join(` ${emojis.media.clap} `)));
      case 'ascii': {
        const art = toAscii(text);
        const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
        return reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.media.paint} **ASCII Art**\n\n\`\`\`\n${art}\n\`\`\``))
            .addSeparatorComponents(sep)],
        });
      }

      // ── Animals ───────────────────────────────────────────────────────────
      case 'dog': {
        const r = await axios.get('https://dog.ceo/api/breeds/image/random');
        return reply(imagePayload(r.data.message, `${emojis.animals.dog} **Woof! Here's a random doggo for you!**`));
      }
      case 'cat': {
        const r = await axios.get('https://api.thecatapi.com/v1/images/search');
        return reply(imagePayload(r.data[0].url, `${emojis.animals.cat} **Meow! A cat has graced your screen.**`));
      }
      case 'fox': {
        const r = await axios.get('https://randomfox.ca/floof/');
        return reply(imagePayload(r.data.image, `${emojis.animals.fox} **A wild fox appeared!**`));
      }
      case 'duck': {
        const r = await axios.get('https://random-d.uk/api/v2/random');
        const msgs = [`${emojis.animals.duck} **Quack quack!**`,`${emojis.animals.duck} **The council of ducks has convened.**`,`${emojis.animals.duck} **This duck is having a better day than you.**`];
        return reply(imagePayload(r.data.url, msgs[Math.floor(Math.random() * msgs.length)]));
      }
      case 'bird': {
        const r = await axios.get('https://shibe.online/api/birds?count=1');
        const msgs = [`${emojis.animals.bird} **Tweet tweet!**`,`${emojis.animals.bird} **Flying high and judging everyone below.**`,`${emojis.animals.bird} **Free bird spotted!**`];
        return reply(imagePayload(r.data[0], msgs[Math.floor(Math.random() * msgs.length)]));
      }
      case 'shibe': {
        const r = await axios.get('https://shibe.online/api/shibes?count=1');
        const msgs = [`${emojis.animals.shiba} **wow. much doge. very shibe.**`,`${emojis.animals.shiba} **Such floof. Very yes.**`,`${emojis.animals.shiba} **10/10 would pet immediately.**`];
        return reply(imagePayload(r.data[0], msgs[Math.floor(Math.random() * msgs.length)]));
      }

      // ── Fun / Misc ────────────────────────────────────────────────────────
      case 'meme': {
        const r = await axios.get('https://meme-api.com/gimme');
        const { url, title, author, subreddit, ups } = r.data;
        return reply(imagePayload(url, `${emojis.fun.jackpot} **${title}**\n${emojis.common.user} u/${author}  •  ${emojis.common.tag} r/${subreddit}  •  ${emojis.common.arrow} ${ups.toLocaleString()} upvotes`));
      }
      case 'waifu': {
        const t = type || 'waifu';
        const r = await axios.get(`https://api.waifu.pics/sfw/${t}`);
        const labels = { waifu: `${emojis.media.sparkle} **A waifu has appeared!**`, neko: `${emojis.animals.cat} **Nyaa~**`, shinobu: `🦋 **Shinobu approves!**`, megumin: `${emojis.media.explosion} **EXPLOSION!**`, awoo: `${emojis.media.wolf} **Awoooooo!**` };
        return reply(imagePayload(r.data.url, labels[t] || `${emojis.media.sparkle} **A waifu has appeared!**`));
      }
      case 'inspiro': {
        const url = `https://inspirobot.me/api?generate=true&t=${Date.now()}`;
        const msgs = [`${emojis.media.stars} **Words to live by... maybe.**`,`${emojis.media.stars} **Deep. Very deep.**`,`${emojis.media.stars} **Crafted by an AI with no soul.**`,`${emojis.media.stars} **This might change your life. Or not.**`];
        return reply(imagePayload(url, msgs[Math.floor(Math.random() * msgs.length)]));
      }
      case 'joke': {
        const t = type || 'Any';
        const r = await axios.get(`https://v2.jokeapi.dev/joke/${t}?blacklistFlags=nsfw,racist,sexist,explicit`);
        const jokeText = r.data.type === 'single'
          ? `${emojis.media.happy} **Joke Time!**\n\n${r.data.joke}`
          : `${emojis.media.happy} **Joke Time!**\n\n${r.data.setup}\n\n||${r.data.delivery}||`;
        const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
        return reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(jokeText))
            .addSeparatorComponents(sep)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Category: ${r.data.category}*`))],
        });
      }
      case 'fact': {
        const r = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        const sep = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
        return reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.fun.dumb} **Random Useless Fact**\n\n*${r.data.text}*`))
            .addSeparatorComponents(sep)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('*Source: uselessfacts.jsph.pl*'))],
        });
      }

      default:
        return reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.status.warning} Unknown subcommand.`))],
        });
    }
  } catch (err) {
    console.error(`[image/${sub}] Error:`, err.message);
    return reply({
      flags: MessageFlags.IsComponentsV2,
      components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.status.warning} Failed to fetch **${sub}**. The API might be down. Try again shortly.`))],
    });
  }
}
