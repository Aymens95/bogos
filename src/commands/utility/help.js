const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Show all available commands"),
  async execute(interaction, client) {
    const names = [...client.commands.keys()].sort().map((name) => `/${name}`).join(", ");
    await interaction.reply({ content: names || "No commands loaded.", flags: 64 });
  }
};
