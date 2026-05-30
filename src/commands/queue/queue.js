const { SlashCommandBuilder } = require("discord.js");
const { buildQueuePayload } = require("../../utils/embedBuilder");
const { getPreferredTextChannel } = require("../../utils/textChannel");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show or restore the queue")
    .addStringOption((option) => option
      .setName("action")
      .setDescription("Queue action")
      .addChoices(
        { name: "Show", value: "show" },
        { name: "Restore saved queue", value: "restore" }
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

    const queue = client.player.getQueue(interaction.guildId);
    queue.textChannel = getPreferredTextChannel(interaction);
    const page = interaction.options.getInteger("page") || 1;
    await interaction.editReply(buildQueuePayload(queue, page));
  }
};
