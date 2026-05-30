const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("previous").setDescription("Go back to the previous song"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const moved = await client.player.previous(interaction.guildId);
    await interaction.editReply(moved ? "Playing previous song." : "No previous song.");
  }
};
