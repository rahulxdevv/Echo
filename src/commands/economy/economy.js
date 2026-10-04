const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emojis = require('../../utils/emojis');
const {
  formatCurrency,
  formatDuration,
  getCooldownRemaining,
  getOrCreateUser,
  getShopItems,
  getShopItemMap,
  resolveAmountInput,
  getNetWorth,
} = require('../../utils/economy');
const { replyError, replyWithCard } = require('../../utils/respond');
const User = require('../../models/User');

// Constants
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const DAILY_STREAK_RESET = 48 * 60 * 60 * 1000; // 48 hours
const ROB_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours

const JOBS = [
  { name: 'freelance developer', min: 160, max: 420 },
  { name: 'graphic designer', min: 120, max: 320 },
  { name: 'community manager', min: 90, max: 240 },
  { name: 'data analyst', min: 180, max: 450 },
  { name: 'support specialist', min: 80, max: 210 },
  { name: 'project lead', min: 200, max: 500 },
];

function pickJob() {
  const job = JOBS[Math.floor(Math.random() * JOBS.length)];
  const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
  return { job, earned };
}

module.exports = {
  category: 'Economy',
  name: 'economy',
  description: 'Economy system commands',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Economy system commands')
    .addSubcommand(subcommand =>
      subcommand.setName('balance').setDescription('Check your or someone else\'s balance')
        .addUserOption(option => option.setName('user').setDescription('The user to check balance of')))
    .addSubcommand(subcommand => subcommand.setName('work').setDescription('Work to earn money'))
    .addSubcommand(subcommand => subcommand.setName('daily').setDescription('Claim your daily reward'))
    .addSubcommand(subcommand =>
      subcommand.setName('deposit').setDescription('Deposit money into your bank')
        .addStringOption(option => option.setName('amount').setDescription('Amount to deposit (or "all"/"half")').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('withdraw').setDescription('Withdraw money from your bank')
        .addStringOption(option => option.setName('amount').setDescription('Amount to withdraw (or "all"/"half")').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('transfer').setDescription('Transfer money to another user')
        .addUserOption(option => option.setName('user').setDescription('The user to transfer to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount to transfer').setRequired(true).setMinValue(1)))
    .addSubcommand(subcommand =>
      subcommand.setName('gamble').setDescription('Gamble your money')
        .addStringOption(option => option.setName('amount').setDescription('Amount to gamble (or "all"/"half")').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('rob').setDescription('Attempt to rob another user')
        .addUserOption(option => option.setName('user').setDescription('The user to rob').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('shop').setDescription('View the shop'))
    .addSubcommand(subcommand =>
      subcommand.setName('buy').setDescription('Buy an item from the shop')
        .addStringOption(option => option.setName('item').setDescription('Item ID to buy').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity to buy').setMinValue(1)))
    .addSubcommand(subcommand => subcommand.setName('inventory').setDescription('View your inventory'))
    .addSubcommand(subcommand =>
      subcommand.setName('leaderboard').setDescription('View the economy leaderboard')
        .addStringOption(option => option.setName('type').setDescription('Leaderboard type')
          .addChoices(
            { name: 'Total Net Worth', value: 'total' },
            { name: 'Wallet Balance', value: 'wallet' },
            { name: 'Bank Balance', value: 'bank' }))),

  async executePrefix(message, args, client) {
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) return replyError(message, 'Please specify a subcommand. Use `!economy balance` to check your balance.');

    switch (subcommand) {
      case 'balance':
      case 'bal':
      case 'b':
        return this.handleBalance(message, args.slice(1), client, true);
      case 'work':
      case 'w':
        return this.handleWork(message, args.slice(1), client, true);
      case 'daily':
      case 'd':
        return this.handleDaily(message, args.slice(1), client, true);
      case 'deposit':
      case 'dep':
        return this.handleDeposit(message, args.slice(1), client, true);
      case 'withdraw':
      case 'with':
        return this.handleWithdraw(message, args.slice(1), client, true);
      case 'transfer':
      case 'give':
        return this.handleTransfer(message, args.slice(1), client, true);
      case 'gamble':
      case 'bet':
        return this.handleGamble(message, args.slice(1), client, true);
      case 'rob':
      case 'steal':
        return this.handleRob(message, args.slice(1), client, true);
      case 'shop':
      case 'store':
        return this.handleShop(message, args.slice(1), client, true);
      case 'buy':
      case 'purchase':
        return this.handleBuy(message, args.slice(1), client, true);
      case 'inventory':
      case 'inv':
        return this.handleInventory(message, args.slice(1), client, true);
      case 'leaderboard':
      case 'lb':
      case 'top':
        return this.handleLeaderboard(message, args.slice(1), client, true);
      default:
        return replyError(message, `Unknown subcommand: ${subcommand}`);
    }
  },

  async executeSlash(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'balance':
        return this.handleBalance(interaction, [], client, false);
      case 'work':
        return this.handleWork(interaction, [], client, false);
      case 'daily':
        return this.handleDaily(interaction, [], client, false);
      case 'deposit':
        return this.handleDeposit(interaction, [], client, false);
      case 'withdraw':
        return this.handleWithdraw(interaction, [], client, false);
      case 'transfer':
        return this.handleTransfer(interaction, [], client, false);
      case 'gamble':
        return this.handleGamble(interaction, [], client, false);
      case 'rob':
        return this.handleRob(interaction, [], client, false);
      case 'shop':
        return this.handleShop(interaction, [], client, false);
      case 'buy':
        return this.handleBuy(interaction, [], client, false);
      case 'inventory':
        return this.handleInventory(interaction, [], client, false);
      case 'leaderboard':
        return this.handleLeaderboard(interaction, [], client, false);
    }
  },

  // Handlers
  async handleBalance(target, args, client, isPrefix) {
    const user = isPrefix
      ? target.mentions.users.first() || target.author
      : target.options.getUser('user') || target.user;

    try {
      const userData = await getOrCreateUser(user);

      await replyWithCard(target, {
        color: 0x00d26a,
        title: `${user.username}'s Balance`,
        description: 'Wallet, bank, and total funds.',
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Bank', value: formatCurrency(userData.bank), inline: true },
          { name: 'Total', value: formatCurrency(userData.balance + userData.bank), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Balance error:', error);
      await replyError(target, 'I could not load that balance right now.');
    }
  },

  async handleWork(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);
      const cooldownRemaining = getCooldownRemaining(userData.lastWork, WORK_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyError(target, `You can work again in ${formatDuration(cooldownRemaining)}.`);
      }

      const { job, earned } = pickJob();
      userData.balance += earned;
      userData.lastWork = new Date();
      await userData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: 'Work Complete',
        description: `You worked as a **${job.name}** and earned **${formatCurrency(earned)}**.`,
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Bank', value: formatCurrency(userData.bank), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Work error:', error);
      await replyError(target, 'I could not complete your work payout right now.');
    }
  },

  async handleDaily(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);
      const cooldownRemaining = getCooldownRemaining(userData.lastDaily, DAILY_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyError(target, `Your next daily reward is ready in ${formatDuration(cooldownRemaining)}.`);
      }

      if (userData.lastDaily && Date.now() - new Date(userData.lastDaily).getTime() > DAILY_STREAK_RESET) {
        userData.dailyStreak = 0;
      }

      const nextStreak = (userData.dailyStreak || 0) + 1;
      const baseReward = Math.floor(Math.random() * (800 - 300 + 1)) + 300; // Random between 300-800
      const streakBonus = Math.min(nextStreak * 75, 750);
      const totalReward = baseReward + streakBonus;

      userData.balance += totalReward;
      userData.lastDaily = new Date();
      userData.dailyStreak = nextStreak;
      await userData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: 'Daily Reward Claimed',
        description: `You received **${formatCurrency(totalReward)}**.`,
        fields: [
          { name: 'Base reward', value: formatCurrency(baseReward), inline: true },
          { name: 'Streak bonus', value: `${formatCurrency(streakBonus)} (${nextStreak} days)`, inline: true },
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Daily error:', error);
      await replyError(target, 'I could not claim your daily reward right now.');
    }
  },

  async handleDeposit(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, 'Please specify an amount to deposit (or "all"/"half").');
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.balance);

      if (!amount || amount < 1) {
        return replyError(target, 'Please provide a valid amount to deposit.');
      }

      if (amount > userData.balance) {
        return replyError(target, `You only have ${formatCurrency(userData.balance)} in your wallet.`);
      }

      userData.balance -= amount;
      userData.bank += amount;
      await userData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: 'Deposit Successful',
        description: `You deposited **${formatCurrency(amount)}** into your bank.`,
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Bank', value: formatCurrency(userData.bank), inline: true },
          { name: 'Total', value: formatCurrency(userData.balance + userData.bank), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Deposit error:', error);
      await replyError(target, 'I could not complete your deposit right now.');
    }
  },

  async handleWithdraw(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, 'Please specify an amount to withdraw (or "all"/"half").');
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.bank);

      if (!amount || amount < 1) {
        return replyError(target, 'Please provide a valid amount to withdraw.');
      }

      if (amount > userData.bank) {
        return replyError(target, `You only have ${formatCurrency(userData.bank)} in your bank.`);
      }

      userData.bank -= amount;
      userData.balance += amount;
      await userData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: 'Withdrawal Successful',
        description: `You withdrew **${formatCurrency(amount)}** from your bank.`,
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Bank', value: formatCurrency(userData.bank), inline: true },
          { name: 'Total', value: formatCurrency(userData.balance + userData.bank), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      await replyError(target, 'I could not complete your withdrawal right now.');
    }
  },

  async handleTransfer(target, args, client, isPrefix) {
    const sender = isPrefix ? target.author : target.user;
    const recipient = isPrefix ? target.mentions.users.first() : target.options.getUser('user');
    const amount = isPrefix ? parseInt(args[1]) : target.options.getInteger('amount');

    if (!recipient) {
      return replyError(target, 'Please mention a user to transfer money to.');
    }

    if (recipient.id === sender.id) {
      return replyError(target, 'You cannot transfer money to yourself.');
    }

    if (recipient.bot) {
      return replyError(target, 'You cannot transfer money to bots.');
    }

    if (!amount || amount < 1) {
      return replyError(target, 'Please provide a valid amount to transfer.');
    }

    try {
      const senderData = await getOrCreateUser(sender);

      if (amount > senderData.balance) {
        return replyError(target, `You only have ${formatCurrency(senderData.balance)} in your wallet.`);
      }

      const recipientData = await getOrCreateUser(recipient);

      senderData.balance -= amount;
      recipientData.balance += amount;

      await senderData.save();
      await recipientData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: 'Transfer Successful',
        description: `You transferred **${formatCurrency(amount)}** to ${recipient.tag}.`,
        fields: [
          { name: 'Your Wallet', value: formatCurrency(senderData.balance), inline: true },
          { name: 'Their Wallet', value: formatCurrency(recipientData.balance), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Transfer error:', error);
      await replyError(target, 'I could not complete your transfer right now.');
    }
  },

  async handleGamble(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, 'Please specify an amount to gamble (or "all"/"half").');
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.balance);

      if (!amount || amount < 1) {
        return replyError(target, 'Please provide a valid amount to gamble.');
      }

      if (amount > userData.balance) {
        return replyError(target, `You only have ${formatCurrency(userData.balance)} in your wallet.`);
      }

      const won = Math.random() > 0.5;
      const multiplier = won ? (Math.random() * 0.5 + 1) : -(Math.random() * 0.5 + 0.5);
      const winnings = Math.floor(amount * Math.abs(multiplier));

      if (won) {
        userData.balance += winnings;
      } else {
        userData.balance -= winnings;
      }

      await userData.save();

      return replyWithCard(target, {
        color: won ? 0x00d26a : 0xff4444,
        title: won ? `${emojis.economy.slots} You Won!` : `${emojis.economy.slots} You Lost!`,
        description: won
          ? `You gambled **${formatCurrency(amount)}** and won **${formatCurrency(winnings)}**!`
          : `You gambled **${formatCurrency(amount)}** and lost **${formatCurrency(winnings)}**.`,
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Result', value: won ? `+${formatCurrency(winnings)}` : `-${formatCurrency(winnings)}`, inline: true },
        ],
        footer: { text: won ? 'Lady luck is on your side!' : 'Better luck next time!' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Gamble error:', error);
      await replyError(target, 'I could not complete your gamble right now.');
    }
  },

  async handleRob(target, args, client, isPrefix) {
    const robber = isPrefix ? target.author : target.user;
    const victim = isPrefix ? target.mentions.users.first() : target.options.getUser('user');

    if (!victim) {
      return replyError(target, 'Please mention a user to rob.');
    }

    if (victim.id === robber.id) {
      return replyError(target, 'You cannot rob yourself.');
    }

    if (victim.bot) {
      return replyError(target, 'You cannot rob bots.');
    }

    try {
      const robberData = await getOrCreateUser(robber);
      const cooldownRemaining = getCooldownRemaining(robberData.lastRob, ROB_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyError(target, `You can rob again in ${formatDuration(cooldownRemaining)}.`);
      }

      const victimData = await getOrCreateUser(victim);

      if (victimData.balance < 100) {
        return replyError(target, `${victim.tag} doesn't have enough money to rob (minimum $100).`);
      }

      const success = Math.random() > 0.5;
      const amount = Math.floor(Math.random() * (victimData.balance * 0.3)) + 50;

      robberData.lastRob = new Date();

      if (success) {
        victimData.balance -= amount;
        robberData.balance += amount;

        await robberData.save();
        await victimData.save();

        return replyWithCard(target, {
          color: 0x00d26a,
          title: `${emojis.economy.money} Robbery Successful!`,
          description: `You successfully robbed **${formatCurrency(amount)}** from ${victim.tag}!`,
          fields: [
            { name: 'Your Wallet', value: formatCurrency(robberData.balance), inline: true },
            { name: 'Their Wallet', value: formatCurrency(victimData.balance), inline: true },
          ],
          footer: { text: 'You got away with it!' },
          timestamp: new Date().toISOString(),
        });
      } else {
        const fine = Math.floor(amount * 0.5);
        robberData.balance = Math.max(0, robberData.balance - fine);

        await robberData.save();

        return replyWithCard(target, {
          color: 0xff4444,
          title: `${emojis.economy.police} Robbery Failed!`,
          description: `You got caught trying to rob ${victim.tag} and paid a fine of **${formatCurrency(fine)}**!`,
          fields: [
            { name: 'Your Wallet', value: formatCurrency(robberData.balance), inline: true },
            { name: 'Fine Paid', value: formatCurrency(fine), inline: true },
          ],
          footer: { text: 'Better luck next time!' },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Rob error:', error);
      await replyError(target, 'I could not complete your robbery attempt right now.');
    }
  },

  async handleShop(target, args, client, isPrefix) {
    try {
      const items = getShopItems();

      const itemList = items.map(item =>
        `**${item.emoji} ${item.name}**\n💰 Price: ${formatCurrency(item.price)}\n🆔 ID: \`${item.id}\``
      ).join('\n\n');

      return replyWithCard(target, {
        color: 0x00d26a,
        title: `${emojis.economy.shop} Shop`,
        description: itemList,
        footer: { text: 'Use /economy buy <item_id> to purchase an item' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Shop error:', error);
      await replyError(target, 'I could not load the shop right now.');
    }
  },

  async handleBuy(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const itemId = isPrefix ? args[0] : target.options.getString('item');
    const quantity = isPrefix ? parseInt(args[1]) || 1 : target.options.getInteger('quantity') || 1;

    if (!itemId) {
      return replyError(target, 'Please specify an item ID to buy.');
    }

    try {
      const shopItems = getShopItemMap();
      const item = shopItems[itemId];

      if (!item) {
        return replyError(target, 'That item does not exist in the shop.');
      }

      const totalCost = item.price * quantity;
      const userData = await getOrCreateUser(user);

      if (userData.balance < totalCost) {
        return replyError(target, `You need ${formatCurrency(totalCost)} to buy ${quantity}x ${item.name}, but you only have ${formatCurrency(userData.balance)}.`);
      }

      userData.balance -= totalCost;

      const existingItem = userData.inventory.find(i => i.itemId === itemId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        userData.inventory.push({
          itemId: itemId,
          name: item.name,
          quantity: quantity,
        });
      }

      await userData.save();

      return replyWithCard(target, {
        color: 0x00d26a,
        title: `${emojis.status.success} Purchase Successful`,
        description: `You bought **${quantity}x ${item.emoji} ${item.name}** for **${formatCurrency(totalCost)}**.`,
        fields: [
          { name: 'Wallet', value: formatCurrency(userData.balance), inline: true },
          { name: 'Total Spent', value: formatCurrency(totalCost), inline: true },
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Buy error:', error);
      await replyError(target, 'I could not complete your purchase right now.');
    }
  },

  async handleInventory(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);

      if (!userData.inventory || userData.inventory.length === 0) {
        return replyError(target, 'Your inventory is empty. Visit the shop to buy items!');
      }

      const shopItems = getShopItemMap();
      const inventoryList = userData.inventory.map(item => {
        const shopItem = shopItems[item.itemId];
        const emoji = shopItem ? shopItem.emoji : emojis.items.box;
        return `${emoji} **${item.name}** x${item.quantity}`;
      }).join('\n');

      return replyWithCard(target, {
        color: 0x00d26a,
        title: `${user.username}'s Inventory`,
        description: inventoryList,
        thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
        footer: { text: `Total items: ${userData.inventory.length}` },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Inventory error:', error);
      await replyError(target, 'I could not load your inventory right now.');
    }
  },

  async handleLeaderboard(target, args, client, isPrefix) {
    const type = isPrefix ? args[0]?.toLowerCase() || 'total' : target.options.getString('type') || 'total';

    try {
      let users;
      let sortField;
      let title;

      switch (type) {
        case 'wallet':
          users = await User.find().sort({ balance: -1 }).limit(10);
          sortField = 'balance';
          title = `${emojis.economy.money} Wallet Leaderboard`;
          break;
        case 'bank':
          users = await User.find().sort({ bank: -1 }).limit(10);
          sortField = 'bank';
          title = `${emojis.economy.bank} Bank Leaderboard`;
          break;
        case 'total':
        default:
          users = await User.find().limit(100);
          users = users.sort((a, b) => getNetWorth(b) - getNetWorth(a)).slice(0, 10);
          sortField = 'total';
          title = `${emojis.economy.trophy} Total Net Worth Leaderboard`;
          break;
      }

      if (users.length === 0) {
        return replyError(target, 'No users found in the leaderboard.');
      }

      const leaderboardText = users.map((user, index) => {
        const medal = index === 0 ? emojis.economy.medal_1 : index === 1 ? emojis.economy.medal_2 : index === 2 ? emojis.economy.medal_3 : `${index + 1}.`;
        let amount;
        if (sortField === 'total') {
          amount = formatCurrency(getNetWorth(user));
        } else if (sortField === 'wallet') {
          amount = formatCurrency(user.balance);
        } else {
          amount = formatCurrency(user.bank);
        }
        return `${medal} **${user.username}** - ${amount}`;
      }).join('\n');

      return replyWithCard(target, {
        color: 0x00d26a,
        title: title,
        description: leaderboardText,
        footer: { text: `Top ${users.length} users` },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      await replyError(target, 'I could not load the leaderboard right now.');
    }
  },
};
