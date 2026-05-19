const { SlashCommandBuilder } = require("discord.js");
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
      )),
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

      const result = client.player.restoreSavedQueue(interaction.guildId, interaction.channel);
      if (!result.ok) {
        await interaction.editReply("No saved queue found.");
        return;
      }

      await client.player.play(interaction.guildId, check.voiceChannel, interaction.channel);
      await interaction.editReply(`Restored ${result.count} song(s) and started playback.`);
      return;
    }

    const queue = client.player.getQueue(interaction.guildId);
    queue.textChannel = interaction.channel;
    await client.player.updateNowPlaying(interaction.guildId);
    await interaction.editReply(`Queue has ${queue.getAll().length} song(s).`);
  }
};
