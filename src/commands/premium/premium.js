const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const PremiumCode = require('../../models/PremiumCode');
const PremiumUser = require('../../models/PremiumUser');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Premium',
  name: 'premium',
  description: 'Manage premium subscriptions and features',
  slashOnly: true,

  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Manage premium subscriptions and features')
    // User Subcommands
    .addSubcommand(sub =>
      sub
        .setName('claim')
        .setDescription('Claim a premium code')
        .addStringOption(opt => opt.setName('code').setDescription('The premium code to claim').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check your premium status')
    )
    // Owner Subcommands
    .addSubcommand(sub =>
      sub
        .setName('generate')
        .setDescription('Generate a premium code (Owner Only)')
        .addStringOption(opt => opt.setName('plan').setDescription('Plan type').addChoices(
          { name: 'Monthly', value: 'monthly' },
          { name: 'Yearly', value: 'yearly' },
          { name: 'Lifetime', value: 'lifetime' }
        ).setRequired(true))
        .addIntegerOption(opt => opt.setName('amount').setDescription('Number of codes to generate').setMinValue(1).setMaxValue(10))
    )
    .addSubcommand(sub =>
      sub
        .setName('revoke')
        .setDescription('Revoke premium from a user (Owner Only)')
        .addUserOption(opt => opt.setName('user').setDescription('The user to revoke premium from').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('gift')
        .setDescription('Gift a premium code to a user (Owner Only)')
        .addUserOption(opt => opt.setName('user').setDescription('The user to gift premium to').setRequired(true))
        .addStringOption(opt => opt.setName('plan').setDescription('Plan type').addChoices(
          { name: 'Monthly', value: 'monthly' },
          { name: 'Yearly', value: 'yearly' },
          { name: 'Lifetime', value: 'lifetime' }
        ).setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all active premium codes (Owner Only)')
    ),

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const ownerSubcommands = ['generate', 'revoke', 'list', 'gift'];

    // Check ownership for restricted subcommands
    if (ownerSubcommands.includes(sub)) {
      const application = await client.application.fetch();
      const isOwner = interaction.user.id === application.owner.id || 
                      (application.owner.ownerId && interaction.user.id === application.owner.ownerId);
      
      if (!isOwner) {
        return interaction.reply({ 
          content: `${emojis.status.error} This subcommand is restricted to the bot owner.`, 
          ephemeral: true 
        });
      }
    }

    // --- USER SUBCOMMANDS ---

    if (sub === 'claim') {
      const codeInput = interaction.options.getString('code');
      const premiumCode = await PremiumCode.findOne({ code: codeInput, status: 'active' });

      if (!premiumCode) {
        return interaction.reply({ content: `${emojis.status.error} Invalid or already redeemed code.`, ephemeral: true });
      }

      const existing = await PremiumUser.findOne({ userId: interaction.user.id });
      if (existing && existing.plan === 'lifetime') {
        return interaction.reply({ content: `${emojis.status.info} You already have a Lifetime subscription!`, ephemeral: true });
      }

      premiumCode.status = 'redeemed';
      premiumCode.redeemedBy = interaction.user.id;
      premiumCode.redeemedAt = new Date();
      await premiumCode.save();

      let expiresAt = null;
      if (premiumCode.plan === 'monthly') {
        expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (premiumCode.plan === 'yearly') {
        expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      if (existing) {
        existing.plan = premiumCode.plan;
        existing.expiresAt = expiresAt;
        existing.redeemedAt = new Date();
        await existing.save();
      } else {
        await PremiumUser.create({ userId: interaction.user.id, plan: premiumCode.plan, expiresAt, redeemedAt: new Date() });
      }

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.common.celebration} Premium Activated!\n\nCongratulations! You have successfully claimed a **${premiumCode.plan}** subscription.`)
      );
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    if (sub === 'status') {
      const premium = await PremiumUser.findOne({ userId: interaction.user.id });
      if (!premium) {
        return interaction.reply({ content: 'You do not have an active premium subscription.', ephemeral: true });
      }
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.categories.info} Premium Status\n\n**Plan:** ${premium.plan}\n${premium.expiresAt ? `**Expires:** <t:${Math.floor(premium.expiresAt.getTime() / 1000)}:R>` : '**Expires:** Never'}`)
      );
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    // --- OWNER SUBCOMMANDS ---

    if (sub === 'generate') {
      const plan = interaction.options.getString('plan');
      const amount = interaction.options.getInteger('amount') || 1;
      const codes = [];

      for (let i = 0; i < amount; i++) {
        const code = `ECHO-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await PremiumCode.create({ code, plan });
        codes.push(code);
      }

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.status.success} Codes Generated\n\n**Plan:** ${plan}\n**Codes:**\n${codes.map(c => `\`${c}\``).join('\n')}`)
      );
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    if (sub === 'revoke') {
      const user = interaction.options.getUser('user');
      const deleted = await PremiumUser.findOneAndDelete({ userId: user.id });
      if (!deleted) return interaction.reply({ content: 'User not found in premium database.', ephemeral: true });
      return interaction.reply({ content: `✅ Revoked premium from **${user.tag}**.`, ephemeral: true });
    }

    if (sub === 'list') {
      const activeCodes = await PremiumCode.find({ status: 'active' });
      if (!activeCodes.length) return interaction.reply({ content: 'No active codes.', ephemeral: true });
      const list = activeCodes.map(c => `- \`${c.code}\` (${c.plan})`).join('\n');
      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Active Codes\n\n${list}`)
      );
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    if (sub === 'gift') {
      const user = interaction.options.getUser('user');
      const plan = interaction.options.getString('plan');
      const code = `ECHO-GIFT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await PremiumCode.create({ code, plan });

      try {
        const container = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${emojis.common.celebration} You've received a Gift!\n\nThe bot owner has gifted you a **${plan}** Premium subscription.\n\n**Code:** \`${code}\`\n\nUse \`/premium claim\` in any server to activate it!`)
        );
        await user.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        return interaction.reply({ content: `✅ Successfully gifted **${plan}** premium to **${user.tag}** via DM.`, ephemeral: true });
      } catch (error) {
        return interaction.reply({ 
          content: `${emojis.status.warning} I couldn't DM **${user.tag}** (DMs are likely closed).\n\n**Generated Code:** \`${code}\` (${plan})`, 
          ephemeral: true 
        });
      }
    }
  }
};
