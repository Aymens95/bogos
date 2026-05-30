const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Show bot latency"),
  async execute(interaction, client) {
    await interaction.reply({ content: `Pong. WebSocket latency: ${client.ws.ping}ms`, flags: 64 });
  }
};
