const { SlashCommandBuilder } = require('discord.js');
const emojis = require('../../utils/emojis');
const {
  formatCurrency,
  formatCountdown,
  getCooldownRemaining,
  getOrCreateUser,
  getShopItems,
  getShopItemMap,
  resolveAmountInput,
  getNetWorth,
} = require('../../utils/economy');
const { replyError, replyNotice } = require('../../utils/respond');
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

function walletLine(userData) {
  return `${emojis.economy.wallet} Wallet **${formatCurrency(userData.balance)}**`;
}

function balanceLine(userData) {
  return `${emojis.economy.wallet} Wallet **${formatCurrency(userData.balance)}** · ${emojis.economy.bank} Bank **${formatCurrency(userData.bank)}**`;
}

/**
 * DM a user, falling back to a channel message (mentioning them) when their DMs are closed.
 */
async function notifyUser(user, dmContent, { channel, fallbackContent } = {}) {
  if (!user) return false;

  if (typeof user.send === 'function') {
    try {
      await user.send(dmContent);
      return true;
    } catch {
      // DMs closed or user unreachable - fall back below.
    }
  }

  if (channel?.send && fallbackContent) {
    await channel.send(fallbackContent).catch(() => null);
  }

  return false;
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

      await replyNotice(
        target,
        `${emojis.economy.wallet} **${user.username}** - Wallet **${formatCurrency(userData.balance)}** · ${emojis.economy.bank} Bank **${formatCurrency(userData.bank)}** · ${emojis.economy.money} Total **${formatCurrency(userData.balance + userData.bank)}**`
      );
    } catch (error) {
      console.error('Balance error:', error);
      await replyError(target, `I couldn't load that balance right now. Please try again in a moment.`);
    }
  },

  async handleWork(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);
      const cooldownRemaining = getCooldownRemaining(userData.lastWork, WORK_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyNotice(
          target,
          `${emojis.economy.clock} You're still tired from your last shift - you can work again in **${formatCountdown(cooldownRemaining)}**.`
        );
      }

      const { job, earned } = pickJob();
      userData.balance += earned;
      userData.lastWork = new Date();
      await userData.save();

      return replyNotice(
        target,
        `${emojis.economy.work} You worked as a **${job.name}** and earned about **${formatCurrency(earned)}**!\n${walletLine(userData)}`
      );
    } catch (error) {
      console.error('Work error:', error);
      await replyError(target, `Something went wrong while paying you for your shift. Please try again.`);
    }
  },

  async handleDaily(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);
      const cooldownRemaining = getCooldownRemaining(userData.lastDaily, DAILY_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyNotice(
          target,
          `${emojis.economy.clock} Your daily is already claimed - come back in **${formatCountdown(cooldownRemaining)}**.`
        );
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

      return replyNotice(
        target,
        `${emojis.economy.daily} You have claimed **${formatCurrency(totalReward)}** as your daily reward!\n` +
        `${emojis.economy.clock} You can claim again after **${formatCountdown(DAILY_COOLDOWN)}** · ${emojis.economy.streak} **${nextStreak} day streak**`
      );
    } catch (error) {
      console.error('Daily error:', error);
      await replyError(target, `I couldn't hand out your daily reward right now. Please try again.`);
    }
  },

  async handleDeposit(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, `${emojis.economy.deposit} How much do you want to deposit? Try a number, \`all\`, or \`half\`.`);
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.balance);

      if (!amount || amount < 1) {
        return replyError(target, `${emojis.economy.deposit} That amount doesn't look right. Try a number like \`500\`, \`all\`, or \`half\`.`);
      }

      if (amount > userData.balance) {
        return replyError(target, `${emojis.economy.wallet} You only have **${formatCurrency(userData.balance)}** in your wallet - that's not enough to deposit.`);
      }

      userData.balance -= amount;
      userData.bank += amount;
      await userData.save();

      return replyNotice(
        target,
        `${emojis.economy.deposit} You successfully deposited **${formatCurrency(amount)}** in your bank!\n${balanceLine(userData)}`
      );
    } catch (error) {
      console.error('Deposit error:', error);
      await replyError(target, `Something went wrong with that deposit. Your money is still in your wallet - please try again.`);
    }
  },

  async handleWithdraw(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, `${emojis.economy.withdraw} How much do you want to withdraw? Try a number, \`all\`, or \`half\`.`);
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.bank);

      if (!amount || amount < 1) {
        return replyError(target, `${emojis.economy.withdraw} That amount doesn't look right. Try a number like \`500\`, \`all\`, or \`half\`.`);
      }

      if (amount > userData.bank) {
        return replyError(target, `${emojis.economy.bank} You only have **${formatCurrency(userData.bank)}** in your bank - that's not enough to withdraw.`);
      }

      userData.bank -= amount;
      userData.balance += amount;
      await userData.save();

      return replyNotice(
        target,
        `${emojis.economy.withdraw} You withdrew **${formatCurrency(amount)}** from your bank!\n${balanceLine(userData)}`
      );
    } catch (error) {
      console.error('Withdraw error:', error);
      await replyError(target, `Something went wrong with that withdrawal. Your money is still in the bank - please try again.`);
    }
  },

  async handleTransfer(target, args, client, isPrefix) {
    const sender = isPrefix ? target.author : target.user;
    const recipient = isPrefix ? target.mentions.users.first() : target.options.getUser('user');
    const amount = isPrefix ? parseInt(args[1]) : target.options.getInteger('amount');

    if (!recipient) {
      return replyError(target, `${emojis.economy.transfer} Who should receive this? Mention a user to transfer money to.`);
    }

    if (recipient.id === sender.id) {
      return replyError(target, `${emojis.economy.transfer} Sending money to yourself won't do much - pick someone else!`);
    }

    if (recipient.bot) {
      return replyError(target, `${emojis.economy.transfer} Bots don't have wallets. Try a real person instead!`);
    }

    if (!amount || amount < 1) {
      return replyError(target, `${emojis.economy.transfer} That amount doesn't look right. Try a number like \`500\`.`);
    }

    try {
      const senderData = await getOrCreateUser(sender);

      if (amount > senderData.balance) {
        return replyError(target, `${emojis.economy.wallet} You only have **${formatCurrency(senderData.balance)}** in your wallet - that's not enough to send.`);
      }

      const recipientData = await getOrCreateUser(recipient);

      senderData.balance -= amount;
      recipientData.balance += amount;

      await senderData.save();
      await recipientData.save();

      const sentAt = Math.floor(Date.now() / 1000);

      const reply = await replyNotice(
        target,
        `${emojis.economy.transfer} Your **${formatCurrency(amount)}** has been transferred to **<@${recipient.id}>** at **<t:${sentAt}:f>**!\n${walletLine(senderData)}`
      );

      await notifyUser(
        recipient,
        `${emojis.economy.received} You received **${formatCurrency(amount)}** from **${sender.username}**!`,
        {
          channel: target.channel,
          fallbackContent: `${emojis.economy.received} <@${recipient.id}>, you received **${formatCurrency(amount)}** from **${sender.username}**!`
        }
      );

      return reply;
    } catch (error) {
      console.error('Transfer error:', error);
      await replyError(target, `Something went wrong with that transfer. Please try again in a moment.`);
    }
  },

  async handleGamble(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const amountInput = isPrefix ? args[0] : target.options.getString('amount');

    if (!amountInput) {
      return replyError(target, `${emojis.economy.gamble} Place a bet first - try \`100\`, \`all\`, or \`half\`.`);
    }

    try {
      const userData = await getOrCreateUser(user);
      const amount = resolveAmountInput(amountInput, userData.balance);

      if (!amount || amount < 1) {
        return replyError(target, `${emojis.economy.gamble} That bet doesn't look right. Try a number like \`100\`, \`all\`, or \`half\`.`);
      }

      if (amount > userData.balance) {
        return replyError(target, `${emojis.economy.gamble} You only have **${formatCurrency(userData.balance)}** in your wallet - you can't bet that much.`);
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

      if (won) {
        return replyNotice(
          target,
          `${emojis.economy.win} Congrats! You bet **${formatCurrency(amount)}** and won **${formatCurrency(winnings)}**!\n${walletLine(userData)}`
        );
      }

      return replyNotice(
        target,
        `${emojis.economy.lose} Tough luck! You bet **${formatCurrency(amount)}** and lost **${formatCurrency(winnings)}**.\n${walletLine(userData)}`
      );
    } catch (error) {
      console.error('Gamble error:', error);
      await replyError(target, `The table closed on you - nothing was lost. Please try again in a moment.`);
    }
  },

  async handleRob(target, args, client, isPrefix) {
    const robber = isPrefix ? target.author : target.user;
    const victim = isPrefix ? target.mentions.users.first() : target.options.getUser('user');

    if (!victim) {
      return replyError(target, `${emojis.economy.rob} Who are you trying to rob? Mention a user.`);
    }

    if (victim.id === robber.id) {
      return replyError(target, `${emojis.economy.rob} Robbing yourself? That's just moving your own money around.`);
    }

    if (victim.bot) {
      return replyError(target, `${emojis.economy.rob} Bots keep their wallets empty - pick a real target.`);
    }

    try {
      const robberData = await getOrCreateUser(robber);
      const cooldownRemaining = getCooldownRemaining(robberData.lastRob, ROB_COOLDOWN);

      if (cooldownRemaining > 0) {
        return replyNotice(
          target,
          `${emojis.economy.clock} Lay low for a while - you can rob again in **${formatCountdown(cooldownRemaining)}**.`
        );
      }

      const victimData = await getOrCreateUser(victim);

      if (victimData.balance < 100) {
        return replyNotice(
          target,
          `${emojis.economy.rob} **${victim.username}** is too broke to rob - they need at least **$100** in their wallet.`
        );
      }

      const success = Math.random() > 0.5;
      const amount = Math.min(
        victimData.balance,
        Math.floor(Math.random() * (victimData.balance * 0.3)) + 50
      );

      robberData.lastRob = new Date();

      if (success) {
        victimData.balance -= amount;
        robberData.balance += amount;

        await robberData.save();
        await victimData.save();

        await notifyUser(
          robber,
          `${emojis.economy.rob} You robbed **${victim.username}** and got **${formatCurrency(amount)}** from their wallet!\n${walletLine(robberData)}`,
          {
            channel: target.channel,
            fallbackContent: `${emojis.economy.rob} <@${robber.id}>, you robbed **${victim.username}** and got **${formatCurrency(amount)}**!`
          }
        );

        await notifyUser(
          victim,
          `${emojis.economy.police} You were robbed by **${robber.username}**! **${formatCurrency(amount)}** was taken from your wallet.\n${walletLine(victimData)}`,
          {
            channel: target.channel,
            fallbackContent: `${emojis.economy.police} <@${victim.id}>, you were robbed by **${robber.username}**! **${formatCurrency(amount)}** was taken from your wallet.`
          }
        );

        return replyNotice(
          target,
          `${emojis.economy.rob} You robbed **${victim.username}** and got **${formatCurrency(amount)}** from their wallet!\n${walletLine(robberData)}`
        );
      }

      const fine = Math.floor(amount * 0.5);
      robberData.balance = Math.max(0, robberData.balance - fine);

      await robberData.save();

      await notifyUser(
        robber,
        `${emojis.economy.fine} Your robbery attempt on **${victim.username}** failed - you got caught and paid a **${formatCurrency(fine)}** fine.\n${walletLine(robberData)}`,
        {
          channel: target.channel,
          fallbackContent: `${emojis.economy.fine} <@${robber.id}>, your robbery attempt on **${victim.username}** failed - you paid a **${formatCurrency(fine)}** fine.`
        }
      );

      await notifyUser(
        victim,
        `${emojis.economy.police} **${robber.username}** tried to rob you, but got caught. Your money is safe!`,
        {
          channel: target.channel,
          fallbackContent: `${emojis.economy.police} <@${victim.id}>, **${robber.username}** tried to rob you, but got caught. Your money is safe!`
        }
      );

      return replyNotice(
        target,
        `${emojis.economy.fine} You got caught trying to rob **${victim.username}** and paid a **${formatCurrency(fine)}** fine!\n${walletLine(robberData)}`
      );
    } catch (error) {
      console.error('Rob error:', error);
      await replyError(target, `That heist fell apart before it began - nothing happened. Please try again.`);
    }
  },

  async handleShop(target, args, client, isPrefix) {
    try {
      const items = getShopItems();

      const itemList = items.map(item =>
        `${item.emoji} **${item.name}** · **${formatCurrency(item.price)}** · \`${item.id}\``
      ).join('\n');

      return replyNotice(
        target,
        `${emojis.economy.shop} **Shop**\n${itemList}\n\nUse \`/economy buy <item_id>\` to purchase.`
      );
    } catch (error) {
      console.error('Shop error:', error);
      await replyError(target, `The shop is closed right now. Please try again in a moment.`);
    }
  },

  async handleBuy(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;
    const itemId = isPrefix ? args[0] : target.options.getString('item');
    const quantity = isPrefix ? parseInt(args[1]) || 1 : target.options.getInteger('quantity') || 1;

    if (!itemId) {
      return replyError(target, `${emojis.economy.shop} Please specify an item ID to buy. Check the shop for IDs.`);
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return replyError(target, `${emojis.economy.shop} The quantity needs to be at least **1**.`);
    }

    try {
      const shopItems = getShopItemMap();
      const item = shopItems[itemId];

      if (!item) {
        return replyError(target, `${emojis.economy.shop} That item doesn't exist. Run the shop command to see what's available.`);
      }

      const totalCost = item.price * quantity;
      const userData = await getOrCreateUser(user);

      if (userData.balance < totalCost) {
        return replyError(
          target,
          `${emojis.economy.wallet} You need **${formatCurrency(totalCost)}** to buy **${quantity}x ${item.name}**, but you only have **${formatCurrency(userData.balance)}**.`
        );
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

      return replyNotice(
        target,
        `${emojis.economy.shop} You bought **${quantity}x ${item.emoji} ${item.name}** for **${formatCurrency(totalCost)}**!\n${walletLine(userData)}`
      );
    } catch (error) {
      console.error('Buy error:', error);
      await replyError(target, `Something went wrong with that purchase. Nothing was charged - please try again.`);
    }
  },

  async handleInventory(target, args, client, isPrefix) {
    const user = isPrefix ? target.author : target.user;

    try {
      const userData = await getOrCreateUser(user);

      if (!userData.inventory || userData.inventory.length === 0) {
        return replyNotice(
          target,
          `${emojis.economy.inventory} Your inventory is empty - head to the shop and grab something!`
        );
      }

      const shopItems = getShopItemMap();
      const inventoryList = userData.inventory.map(item => {
        const shopItem = shopItems[item.itemId];
        const emoji = shopItem ? shopItem.emoji : emojis.items.box;
        return `${emoji} **${item.name}** x${item.quantity}`;
      }).join('\n');

      return replyNotice(
        target,
        `${emojis.economy.inventory} **${user.username}'s Inventory**\n${inventoryList}`
      );
    } catch (error) {
      console.error('Inventory error:', error);
      await replyError(target, `I couldn't open your inventory right now. Please try again.`);
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
          title = `${emojis.economy.wallet} Wallet Leaderboard`;
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
        return replyNotice(target, `${emojis.economy.trophy} The leaderboard is empty - start earning to claim the top spot!`);
      }

      const leaderboardText = users.map((user, index) => {
        const medal = index === 0 ? emojis.economy.medal_1 : index === 1 ? emojis.economy.medal_2 : index === 2 ? emojis.economy.medal_3 : `${index + 1}.`;
        const amount = sortField === 'total'
          ? formatCurrency(getNetWorth(user))
          : sortField === 'wallet'
            ? formatCurrency(user.balance)
            : formatCurrency(user.bank);
        return `${medal} **${user.username}** - ${amount}`;
      }).join('\n');

      return replyNotice(target, `${title}\n${leaderboardText}`);
    } catch (error) {
      console.error('Leaderboard error:', error);
      await replyError(target, `I couldn't load the leaderboard right now. Please try again.`);
    }
  },
};
