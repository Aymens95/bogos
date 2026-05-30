const { SlashCommandBuilder } = require("discord.js");
const { buildQueuePayload } = require("../../utils/embedBuilder");
const { getPreferredTextChannel } = require("../../utils/textChannel");
const { requireVoiceChannel } = require("../../utils/voiceChecks");
const { formatDuration } = require("../../utils/formatDuration");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show or restore the queue")
    .addStringOption((option) => option
      .setName("action")
      .setDescription("Queue action")
      .addChoices(
        { name: "Show", value: "show" },
        { name: "Restore saved queue", value: "restore" },
        { name: "Export to file", value: "export" }
      ))
    .addIntegerOption((option) => option
      .setName("page")
      .setDescription("Queue page to show")
      .setMinValue(1)),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const action = interaction.options.getString("action") || "show";
    if (action === "restore") {
      const check = requireVoiceChannel(interaction);
      if (!check.ok) {
        await interaction.editReply(check.message);
        return;
      }

      if (client.player.connections.has(interaction.guildId)) {
        await interaction.editReply("Playback is already active. Stop it before restoring a saved queue.");
        return;
      }

      const textChannel = getPreferredTextChannel(interaction);
      const result = client.player.restoreSavedQueue(interaction.guildId, textChannel);
      if (!result.ok) {
        await interaction.editReply("No saved queue found.");
        return;
      }

      await client.player.play(interaction.guildId, check.voiceChannel, textChannel);
      await interaction.editReply(`Restored ${result.count} song(s) and started playback.`);
      return;
    }

    if (action === "export") {
      const queue = client.player.getQueue(interaction.guildId);
      const songs = queue.getAll();
      if (!songs.length) {
        await interaction.editReply("The queue is empty.");
        return;
      }

      const totalSeconds = songs.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
      const guildName = interaction.guild?.name || "Server";
      const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const lines = [
        `Bogos Queue Export — ${guildName}`,
        `Exported: ${now}`,
        "─".repeat(40),
        ...songs.map((s, i) => `${i + 1}. ${s.title || "Unknown"} — ${s.artist || "Unknown"} (${s.durationFormatted || "0:00"})`),
        "─".repeat(40),
        `Total: ${songs.length} song(s) • ${formatDuration(totalSeconds)}`
      ];

      const text = lines.join("\n");
      await interaction.editReply({ files: [{ name: "queue.txt", attachment: Buffer.from(text, "utf8") }] });
      return;
    }

    const queue = client.player.getQueue(interaction.guildId);
    queue.textChannel = getPreferredTextChannel(interaction);
    const page = interaction.options.getInteger("page") || 1;
    await interaction.editReply(buildQueuePayload(queue, page));
  }
};
