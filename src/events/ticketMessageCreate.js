const { getTicketByChannel, addToTranscript } = require('../utils/tickets');

module.exports = {
  name: 'ticketMessageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      const ticket = await getTicketByChannel(message.channel.id);

      if (!ticket) return;

      const attachments = message.attachments.map(att => att.url);

      await addToTranscript(
        ticket,
        message.author.tag,
        message.author.id,
        message.content,
        attachments
      );
    } catch (error) {
      console.error('Ticket message tracking error:', error);
    }
  }
};
