const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("clear").setDescription("Clear the entire queue"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    client.player.getQueue(interaction.guildId).clear();
    await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    await interaction.editReply("Queue cleared.");
  }
};
