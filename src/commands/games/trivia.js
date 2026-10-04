const {
  SlashCommandBuilder,
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

module.exports = {
  category: 'Games',
  name: 'trivia',
  description: 'Answer a trivia question',
  slashOnly: false,

  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a trivia question'),

  async executePrefix(message, args, client) {
    await message.reply(createTriviaPayload());
  },

  async executeSlash(interaction, client) {
    await interaction.reply(createTriviaPayload());
  }
};

const triviaQuestions = [
  { question: "What is the capital of France?", answer: "Paris", options: ["London", "Paris", "Berlin", "Madrid"] },
  { question: "What is 2 + 2?", answer: "4", options: ["3", "4", "5", "6"] },
  { question: "What planet is known as the Red Planet?", answer: "Mars", options: ["Venus", "Mars", "Jupiter", "Saturn"] },
  { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"] },
  { question: "What is the largest ocean on Earth?", answer: "Pacific Ocean", options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"] },
  { question: "How many continents are there?", answer: "7", options: ["5", "6", "7", "8"] },
  { question: "What is the smallest country in the world?", answer: "Vatican City", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"] },
  { question: "What year did World War II end?", answer: "1945", options: ["1943", "1944", "1945", "1946"] },
  { question: "What is the chemical symbol for gold?", answer: "Au", options: ["Go", "Gd", "Au", "Ag"] },
  { question: "How many sides does a hexagon have?", answer: "6", options: ["5", "6", "7", "8"] }
];

function createTriviaPayload() {
  const trivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
  const shuffled = [...trivia.options].sort(() => Math.random() - 0.5);

  let triviaText = `# 🎯 Trivia Question\n\n`;
  triviaText += `**${trivia.question}**\n\n`;
  shuffled.forEach((option, index) => {
    triviaText += `${index + 1}. ${option}\n`;
  });
  triviaText += `\n*Answer:* ||${trivia.answer}||`;

  const textDisplay = new TextDisplayBuilder().setContent(triviaText);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(textDisplay)
    .addSeparatorComponents(separator);

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
}
