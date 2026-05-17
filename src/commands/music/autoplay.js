const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const queue = client.player.getQueue(interaction.guildId);
    await client.player.toggleAutoplay(interaction.guildId);
    await interaction.editReply(`Autoplay ${queue.autoplay ? "enabled" : "disabled"}.`);
  }
};
