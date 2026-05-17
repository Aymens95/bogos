const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause the current song"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    await client.player.pause(interaction.guildId);
    await interaction.editReply("Paused.");
  }
};
