const { SlashCommandBuilder } = require("discord.js");
const { parseTimestamp } = require("../../utils/formatDuration");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Seek to a position in the current track")
    .addStringOption((option) => option
      .setName("timestamp")
      .setDescription("Timestamp like 1:23 or 01:02:03")
      .setRequired(true)),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });

    const seconds = parseTimestamp(interaction.options.getString("timestamp", true));
    if (seconds === null) return interaction.reply({ content: "Invalid timestamp.", flags: 64 });

    await interaction.deferReply({ flags: 64 });
    await client.player.seek(interaction.guildId, seconds);
    await interaction.editReply("Seek requested.");
  }
};
