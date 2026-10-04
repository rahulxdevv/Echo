const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const emojis = require('../../utils/emojis');

// ─── Shared builder helpers ────────────────────────────────────────────────────

const sep = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);

function card(content) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .addSeparatorComponents(sep())],
  };
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Data pools ───────────────────────────────────────────────────────────────

const BALL_RESPONSES = [
  { text: 'It is certain.', type: emojis.status.check }, { text: 'It is decidedly so.', type: emojis.status.check },
  { text: 'Without a doubt.', type: emojis.status.check }, { text: 'Yes, definitely.', type: emojis.status.check },
  { text: 'You may rely on it.', type: emojis.status.check }, { text: 'Most likely.', type: emojis.status.check },
  { text: 'Outlook good.', type: emojis.status.check }, { text: 'Signs point to yes.', type: emojis.status.check },
  { text: 'Reply hazy, try again.', type: emojis.status.wait }, { text: 'Ask again later.', type: emojis.status.wait },
  { text: 'Better not tell you now.', type: emojis.status.wait }, { text: 'Cannot predict now.', type: emojis.status.wait },
  { text: "Don't count on it.", type: emojis.status.cross }, { text: 'My reply is no.', type: emojis.status.cross },
  { text: 'My sources say no.', type: emojis.status.cross }, { text: 'Very doubtful.', type: emojis.status.cross },
  { text: 'Absolutely not, what were you thinking?', type: emojis.status.cross },
  { text: 'Lol no.', type: emojis.status.cross }, { text: 'The stars say yes but I say no.', type: emojis.status.wait },
  { text: 'Bold of you to even ask.', type: emojis.status.wait },
];

const WYR_QUESTIONS = [
  { a: 'Have the ability to fly', b: 'Have the ability to become invisible' },
  { a: 'Live without music', b: 'Live without movies' },
  { a: 'Fight 100 duck-sized horses', b: 'Fight 1 horse-sized duck' },
  { a: 'Always be 10 minutes late', b: 'Always be 20 minutes early' },
  { a: 'Know how you die', b: 'Know when you die' },
  { a: 'Never be able to use a phone again', b: 'Never be able to use a computer again' },
  { a: 'Have unlimited money but no friends', b: 'Have unlimited friends but no money' },
  { a: 'Be famous but hated', b: 'Be unknown but loved by everyone you meet' },
  { a: 'Only speak in rhymes', b: 'Only speak in questions' },
  { a: 'Have a pause button for life', b: 'Have a rewind button for life' },
  { a: 'Lose all your memories', b: 'Never be able to make new ones' },
  { a: 'Have super strength', b: 'Have super speed' },
  { a: 'Eat pizza every day forever', b: 'Never eat pizza again' },
  { a: 'Know every language', b: 'Be able to talk to animals' },
  { a: 'Live in the past', b: 'Live in the future' },
];

const TRUTHS = [
  "What's the most embarrassing thing you've ever done in public?",
  "What's a secret you've never told anyone here?",
  "What's the worst lie you've ever told?",
  "What's the weirdest dream you've had recently?",
  "Who here do you think is the most annoying?",
  "What's something you pretend to like but actually hate?",
  "What's the most childish thing you still do?",
  "Have you ever blamed someone else for something you did?",
  "What's your biggest irrational fear?",
  "What's the most cringe thing you did as a kid?",
];

const DARES = [
  'Change your nickname to "Silly Goose" for 10 minutes.',
  'Send a voice message saying "I am the greatest" three times.',
  'Type your next 5 messages in all caps.',
  'Add three random emojis to everything you send for the next 5 minutes.',
  'Send the most recent photo in your camera roll (keep it appropriate!).',
  'Compliment every person in this server in the next 2 minutes.',
  'Say "I love pickles" at the end of every message for 5 minutes.',
  'Copy the speaking style of the person above you for 3 messages.',
  'Pretend to be a robot for the next 10 minutes.',
  'Write a poem about the last thing you ate.',
];

const PREDICTIONS = [
  'In exactly 3 years, you will trip on a sidewalk in a very public place.',
  'Someone in your contacts is secretly a professional thumb wrestler.',
  'You will accidentally send a voice message to the wrong person this week.',
  'Your arch nemesis is someone who looks exactly like you but wears different socks.',
  'Within 24 hours you will say "wait, what?" at least 4 times.',
  'The next song you hear will be stuck in your head for 3 days.',
  'A pigeon is watching you right now and judging your choices.',
  'You will forget why you walked into a room at least twice today.',
  'You are one bad day away from adopting 4 cats.',
  'Your future self is cringing at a decision you made today.',
  'Someone you ghosted is thinking about you as you read this.',
  'You will say "one more episode" and watch 6 tonight.',
];

const ROASTS = [
  "You're the human equivalent of a participation trophy.",
  "I'd agree with you but then we'd both be wrong.",
  "Your secrets are safe with me. I never pay attention to anything you say.",
  "I'm not saying you're dumb, but you'd drown looking up in the rain.",
  "You have something on your face. Oh wait, that's just your face.",
  "I'd tell you to go outside but you'd probably break something.",
  "You're not completely useless. You can always serve as a bad example.",
  "Your wifi password is probably your birthday, isn't it.",
  "You look like you'd argue with the self-checkout machine and lose.",
  "I've seen better plans written on a napkin. By a toddler.",
];

const COMPLIMENTS = [
  "You're the reason someone smiles for no reason today. That's powerful.",
  "You bring a kind of energy to this server that just makes it better.",
  "You radiate the confidence of someone who has read a Wikipedia article once.",
  "You're someone who actually types 'lol' and means it sometimes. Rare.",
  "If you were a pizza topping, you'd be the pepperoni. Classic, reliable, beloved.",
  "You make people feel heard. That's rarer than you think.",
  "Statistically speaking, you're in the top 100% of humans in this chat.",
  "You could start a cult. People would join. That says a lot.",
  "You have the kind of vibe that makes dogs trust you immediately.",
  "Not everyone can pull off existing this effortlessly. You make it look easy.",
];

// ─── Command ──────────────────────────────────────────────────────────────────

module.exports = {
  category: 'Fun',
  name: 'fun',
  description: 'Fun and funny commands for your server',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun and funny commands for your server')
    // Classic
    .addSubcommand(s => s.setName('8ball').setDescription('Ask the magic 8-ball a question').addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)))
    .addSubcommand(s => s.setName('coinflip').setDescription('Flip a coin'))
    .addSubcommand(s => s.setName('roll').setDescription('Roll a dice').addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)').setMinValue(2).setMaxValue(1000)))
    .addSubcommand(s => s.setName('rps').setDescription('Play rock paper scissors').addStringOption(o => o.setName('choice').setDescription('Your choice').setRequired(true).addChoices({ name: 'Rock', value: 'rock' },{ name: 'Paper', value: 'paper' },{ name: 'Scissors', value: 'scissors' })))
    .addSubcommand(s => s.setName('rate').setDescription('Rate something out of 10').addStringOption(o => o.setName('thing').setDescription('What to rate').setRequired(true)))
    .addSubcommand(s => s.setName('ship').setDescription('Calculate love compatibility between two users').addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true)).addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(true)))
    .addSubcommand(s => s.setName('wouldyourather').setDescription('Get a random would you rather question'))
    // New fun
    .addSubcommand(s => s.setName('truth').setDescription('Get a random truth question'))
    .addSubcommand(s => s.setName('dare').setDescription('Get a random dare challenge'))
    .addSubcommand(s => s.setName('predict').setDescription('Get a useless prediction about your future'))
    .addSubcommand(s => s.setName('roast').setDescription('Get gently roasted by the bot'))
    .addSubcommand(s => s.setName('compliment').setDescription('Receive a totally genuine compliment'))
    .addSubcommand(s => s.setName('reverse').setDescription('Reverse your text (but funnier)').addStringOption(o => o.setName('text').setDescription('Text to reverse').setRequired(true)))
    .addSubcommand(s => s.setName('slots').setDescription('Spin the slot machine'))
    .addSubcommand(s => s.setName('howdumb').setDescription('Find out how dumb you are today').addUserOption(o => o.setName('user').setDescription('User to measure (default: you)'))),

  async executePrefix(message, args, client) {
    const sub = args[0]?.toLowerCase();
    if (!sub) return message.reply(card(`${emojis.categories?.giveaway || emojis.giveaway || '🎉'} **Fun Commands**\n\n\`8ball\`, \`coinflip\`, \`roll\`, \`rps\`, \`rate\`, \`ship\`, \`wouldyourather\`, \`truth\`, \`dare\`, \`predict\`, \`roast\`, \`compliment\`, \`reverse\`, \`slots\`, \`howdumb\`\n\n*Usage: \`${client.config.prefix}fun <subcommand>\`*`));

    const text = args.slice(1).join(' ');
    const user1 = message.mentions.users.first();
    const user2 = message.mentions.users.size > 1 ? Array.from(message.mentions.users.values())[1] : null;

    return handle(sub, { text, sides: parseInt(args[1]) || 6, user1: user1 || message.author, user2 }, message, null);
  },

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    const opts = {
      text: interaction.options.getString('text') || interaction.options.getString('question') || interaction.options.getString('thing') || interaction.options.getString('choice') || '',
      sides: interaction.options.getInteger('sides') || 6,
      user1: interaction.options.getUser('user1') || interaction.user,
      user2: interaction.options.getUser('user2'),
    };

    return handle(sub, opts, null, interaction);
  },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handle(sub, opts, message, interaction) {
  const reply = p => interaction ? interaction.editReply(p) : message.reply(p);

  switch (sub) {

    case '8ball': {
      if (!opts.text) return reply(card(`${emojis.status.warning} Ask a question!`));
      const r = rand(BALL_RESPONSES);
      return reply(card(`${emojis.fun.eight_ball} **Magic 8-Ball**\n\n**Question:** ${opts.text}\n\n${r.type} **${r.text}**`));
    }

    case 'coinflip': {
      const result = Math.random() < 0.5 ? `Heads ${emojis.fun.coin}` : `Tails ${emojis.fun.slots}`;
      const flavour = Math.random() < 0.5 ? '*The coin dramatically spins before landing.*' : '*It bounces off the edge. Twice. Then settles.*';
      return reply(card(`${emojis.fun.coin} **Coin Flip**\n\n**Result:** **${result}**\n\n${flavour}`));
    }

    case 'roll': {
      const sides = opts.sides;
      const roll = Math.floor(Math.random() * sides) + 1;
      return reply(card(`${emojis.fun.dice} **Dice Roll** (d${sides})\n\n**Result:** **${roll}**${roll === sides ? `\n\n${emojis.categories?.giveaway || emojis.giveaway || '🎉'} *Max roll! The dice gods smile upon you.*` : roll === 1 ? `\n\n${emojis.fun.skull} *You rolled a 1. Yikes.*` : ''}`));
    }

    case 'rps': {
      const choice = opts.text?.toLowerCase();
      if (!['rock','paper','scissors'].includes(choice)) return reply(card(`${emojis.status.warning} Choose: \`rock\`, \`paper\`, or \`scissors\``));
      const choices = ['rock','paper','scissors'];
      const bot = rand(choices);
      const emojis_rps = { rock: emojis.fun.rock, paper: emojis.fun.paper, scissors: emojis.fun.scissors };
      const tie = choice === bot;
      const win = (choice === 'rock' && bot === 'scissors') || (choice === 'paper' && bot === 'rock') || (choice === 'scissors' && bot === 'paper');
      const resultLine = tie ? `It's a tie! ${emojis.fun.tie}` : win ? `You win! ${emojis.fun.trophy}` : `You lose! ${emojis.fun.skull}`;
      return reply(card(`${emojis_rps[choice]} **Rock Paper Scissors**\n\n**You:** ${emojis_rps[choice]} ${choice}\n**Bot:** ${emojis_rps[bot]} ${bot}\n\n**${resultLine}**`));
    }

    case 'rate': {
      if (!opts.text) return reply(card(`${emojis.status.warning} Provide something to rate.`));
      const rating = Math.floor(Math.random() * 11);
      const bar = '🟩'.repeat(rating) + '⬜'.repeat(10 - rating);
      const comment = rating === 10 ? 'Peak perfection.' : rating >= 7 ? 'Pretty solid honestly.' : rating >= 4 ? 'Room to grow.' : rating >= 1 ? 'Rough.' : 'Absolutely not.';
      return reply(card(`📊 **Rating**\n\n**Item:** ${opts.text}\n**Score:** ${rating}/10\n${bar}\n\n*${comment}*`));
    }

    case 'ship': {
      const { user1, user2 } = opts;
      if (!user2) return reply(card(`${emojis.status.warning} You need to mention two users.`));
      const pct = Math.floor(Math.random() * 101);
      const hearts = emojis.social.heart.repeat(Math.floor(pct / 10)) + emojis.social.black_heart.repeat(10 - Math.floor(pct / 10));
      const verdict = pct >= 80 ? `Soulmates. ${emojis.social.revolving_hearts}` : pct >= 60 ? `Great match! ${emojis.social.sparkling_heart}` : pct >= 40 ? `There's potential. ${emojis.social.two_hearts}` : pct >= 20 ? `Complicated. ${emojis.social.broken_heart}` : `Absolutely not. ${emojis.status.no_disturb}`;
      return reply(card(`${emojis.social.heart_pulse} **Love Calculator**\n\n**${user1.username}** ${emojis.social.two_hearts} **${user2.username}**\n\n**Compatibility:** ${pct}%\n${hearts}\n\n*${verdict}*`));
    }

    case 'wouldyourather': {
      const q = rand(WYR_QUESTIONS);
      return reply(card(`${emojis.fun.thinking} **Would You Rather?**\n\n**A)** ${q.a}\n\n**B)** ${q.b}\n\n*Drop your pick in chat!*`));
    }

    case 'truth':
      return reply(card(`${emojis.fun.crystal_ball} **Truth**\n\n*${rand(TRUTHS)}*\n\n*Answer honestly or forfeit your dignity.*`));

    case 'dare':
      return reply(card(`${emojis.fun.target} **Dare**\n\n*${rand(DARES)}*\n\n*Do it or forever be known as a coward.*`));

    case 'predict':
      return reply(card(`${emojis.fun.telescope} **Your Future Has Been Calculated**\n\n*${rand(PREDICTIONS)}*\n\n-# Accuracy not guaranteed. Results may vary. Void where prohibited by common sense.`));

    case 'roast':
      return reply(card(`${emojis.status.fire} **Roast of the Day**\n\n*${rand(ROASTS)}*\n\n-# No feelings were permanently damaged in the making of this message.`));

    case 'compliment':
      return reply(card(`${emojis.media.flower} **Compliment**\n\n*${rand(COMPLIMENTS)}*\n\n-# 100% genuine. Definitely not computer-generated.`));

    case 'reverse': {
      if (!opts.text) return reply(card(`${emojis.status.warning} Provide text to reverse.`));
      const rev = opts.text.split('').reverse().join('');
      return reply(card(`${emojis.fun.reverse} **Reversed Text**\n\n**Original:** ${opts.text}\n**Reversed:** ${rev}`));
    }

    case 'slots': {
      const symbols = [emojis.fun.cherry, emojis.fun.lemon, emojis.fun.grape, emojis.fun.watermelon, emojis.fun.star, emojis.fun.diamond, emojis.fun.slots, emojis.fun.bell];
      const s1 = rand(symbols), s2 = rand(symbols), s3 = rand(symbols);
      const win3 = s1 === s2 && s2 === s3;
      const win2 = !win3 && (s1 === s2 || s2 === s3 || s1 === s3);
      const result = win3 ? `${emojis.fun?.jackpot || emojis.categories?.giveaway || emojis.giveaway || '🎉'} **JACKPOT! Three of a kind!**` : win2 ? `${emojis.fun.shiny} **Two of a kind! Close!**` : `${emojis.fun.skull} **Nothing. Better luck next time.**`;
      return reply(card(`${emojis.fun.slots} **Slot Machine**\n\n**[ ${s1} | ${s2} | ${s3} ]**\n\n${result}`));
    }

    case 'howdumb': {
      const target = opts.user1;
      const pct = Math.floor(Math.random() * 101);
      const bar = '🟥'.repeat(Math.floor(pct / 10)) + '⬜'.repeat(10 - Math.floor(pct / 10));
      const comment = pct >= 90 ? 'Practically a rock with Wi-Fi.' : pct >= 70 ? 'Outstanding achievement in questionable decisions.' : pct >= 50 ? 'Average dumb. Nothing special.' : pct >= 30 ? 'Somewhat sensible. Suspicious.' : 'Disturbingly intelligent. Watch this one.';
      return reply(card(`${emojis.fun.dumb} **Dumbness Meter**\n\n**Subject:** ${target.username}\n**Dumbness Level:** ${pct}%\n${bar}\n\n*${comment}*\n\n-# Scientifically measured using vibes and a random number.`));
    }

    default:
      return reply(card(`${emojis.status.warning} Unknown subcommand.`));
  }
}
