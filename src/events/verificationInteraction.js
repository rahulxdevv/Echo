const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { 
  getVerificationConfig, 
  generateMathEquation, 
  generateImageCaptcha, 
  setPendingVerification, 
  checkPendingVerification 
} = require('../utils/verification');

module.exports = {
  name: 'verificationInteraction',
  async execute(interaction, client) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('verify_')) return;

    try {
      const config = await getVerificationConfig(interaction.guild.id);
      
      if (!config.enabled || !config.roleId) {
        return interaction.reply({ content: 'Verification is currently disabled or misconfigured.', ephemeral: true });
      }

      const role = interaction.guild.roles.cache.get(config.roleId);
      if (!role) {
        return interaction.reply({ content: 'The verification role could not be found. Please contact an admin.', ephemeral: true });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({ content: 'You are already verified!', ephemeral: true });
      }

      // Handle the initial verify button click
      if (interaction.customId === 'verify_start') {
        if (config.type === 'button') {
          await interaction.member.roles.add(role);
          return interaction.reply({ content: '✅ You have been successfully verified!', ephemeral: true });
        }
        
        if (config.type === 'math') {
          const { equation, answer } = generateMathEquation();
          setPendingVerification(interaction.user.id, answer);

          // Generate 3 wrong answers + 1 correct answer
          const options = new Set([answer]);
          while (options.size < 4) {
            const wrong = parseInt(answer) + Math.floor(Math.random() * 20) - 10;
            if (wrong !== parseInt(answer)) options.add(wrong.toString());
          }
          
          const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

          const row = new ActionRowBuilder();
          shuffledOptions.forEach(opt => {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`verify_math_${opt}`)
                .setLabel(opt)
                .setStyle(ButtonStyle.Primary)
            );
          });

          return interaction.reply({
            content: `**Math Verification**\nSolve this equation to verify: \`${equation} = ?\``,
            components: [row],
            ephemeral: true
          });
        }

        if (config.type === 'captcha') {
          const { buffer, answer } = generateImageCaptcha();
          setPendingVerification(interaction.user.id, answer);

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('verify_captcha_btn')
              .setLabel('Submit Answer')
              .setStyle(ButtonStyle.Primary)
          );

          return interaction.reply({
            content: '**Image Captcha Verification**\nPlease read the text in the image below and click the button to submit your answer. The answer is case-insensitive.',
            files: [{ attachment: buffer, name: 'captcha.png' }],
            components: [row],
            ephemeral: true
          });
        }
      }

      // Handle the Math button click
      if (interaction.customId.startsWith('verify_math_')) {
        const providedAnswer = interaction.customId.replace('verify_math_', '');
        const result = checkPendingVerification(interaction.user.id, providedAnswer);

        if (result.valid) {
          await interaction.member.roles.add(role);
          await interaction.update({ content: '✅ Correct! You have been successfully verified.', components: [] });
        } else {
          await interaction.update({ content: `❌ Verification failed: ${result.reason}\nPlease click the main verify button to try again.`, components: [] });
        }
        return;
      }

      // Handle the Captcha modal open button
      if (interaction.customId === 'verify_captcha_btn') {
        const modal = new ModalBuilder()
          .setCustomId('verify_captcha_modal')
          .setTitle('Captcha Verification');

        const answerInput = new TextInputBuilder()
          .setCustomId('captcha_answer')
          .setLabel('Enter the text from the image')
          .setStyle(TextInputStyle.Short)
          .setMinLength(6)
          .setMaxLength(6)
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(answerInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
        return;
      }

      // Handle the Captcha modal submit
      if (interaction.isModalSubmit() && interaction.customId === 'verify_captcha_modal') {
        const providedAnswer = interaction.fields.getTextInputValue('captcha_answer');
        const result = checkPendingVerification(interaction.user.id, providedAnswer);

        if (result.valid) {
          await interaction.member.roles.add(role);
          await interaction.reply({ content: '✅ Correct! You have been successfully verified.', ephemeral: true });
        } else {
          await interaction.reply({ content: `❌ Verification failed: ${result.reason}\nPlease click the main verify button to try again.`, ephemeral: true });
        }
        return;
      }

    } catch (error) {
      console.error('Verification interaction error:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'An error occurred during verification.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'An error occurred during verification.', ephemeral: true });
      }
    }
  }
};
