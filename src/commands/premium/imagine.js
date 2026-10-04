const {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  AttachmentBuilder,
} = require('discord.js');
const PremiumUser = require('../../models/PremiumUser');
const emojis = require('../../utils/emojis');

module.exports = {
  category: 'Premium',
  name: 'imagine',
  description: 'Generate stunning AI images (Premium Only)',
  slashOnly: true,

  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate stunning AI images (Premium Only)')
    .addStringOption(opt => opt.setName('prompt').setDescription('Describe the image you want to see').setRequired(true))
    .addStringOption(opt => opt.setName('ratio').setDescription('Aspect ratio').addChoices(
        { name: 'Square (1:1)', value: '1:1' },
        { name: 'Wide (16:9)', value: '16:9' },
        { name: 'Portrait (9:16)', value: '9:16' }
    )),

  async executeSlash(interaction, client) {
    // Check premium
    const isPremium = await PremiumUser.findOne({ userId: interaction.user.id });
    if (!isPremium) {
      return interaction.reply({ 
        content: `${emojis.status.warning} This is a **Premium Command**. Please support the bot to access AI image generation.`, 
        ephemeral: true 
      });
    }

    await interaction.deferReply();

    const prompt = interaction.options.getString('prompt');
    const ratio = interaction.options.getString('ratio') || '1:1';

    let width = 1024;
    let height = 1024;

    if (ratio === '16:9') { width = 1024; height = 576; }
    else if (ratio === '9:16') { width = 576; height = 1024; }

    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

    try {
      const attachment = new AttachmentBuilder(imageUrl, { name: 'imagine.png' });

      const container = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.categories.image} AI Imagine\n\n**Prompt:** ${prompt}\n**Aspect Ratio:** ${ratio}`)
      );

      await interaction.editReply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [container],
        files: [attachment]
      });
    } catch (error) {
      console.error('Imagine Error:', error);
      await interaction.editReply('Sorry, I encountered an error while generating your image. Please try again later.');
    }
  }
};
