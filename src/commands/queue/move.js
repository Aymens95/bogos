const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Move a song to a different position")
    .addIntegerOption((option) => option.setName("from").setDescription("Current position").setMinValue(1).setRequired(true))
    .addIntegerOption((option) => option.setName("to").setDescription("New position").setMinValue(1).setRequired(true)),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const queue = client.player.getQueue(interaction.guildId);
    const from = interaction.options.getInteger("from", true) - 1;
    const to = interaction.options.getInteger("to", true) - 1;
    const moved = queue.move(from, to);
    await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    await interaction.editReply(moved ? "Song moved." : "Invalid queue positions.");
  }
};
