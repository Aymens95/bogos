const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a song from the queue")
    .addIntegerOption((option) => option.setName("position").setDescription("Queue position").setMinValue(1).setRequired(true)),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const queue = client.player.getQueue(interaction.guildId);
    const removed = queue.remove(interaction.options.getInteger("position", true) - 1);
    if (removed) client.player.saveQueue(interaction.guildId);
    await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    await interaction.editReply(removed ? `Removed ${removed.title}.` : "No song at that position.");
  }
};
