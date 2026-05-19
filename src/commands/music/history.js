const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const PlaybackHistory = require("../../music/PlaybackHistory");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

function buildHistoryEmbed(history) {
  const lines = history.slice(0, 25).map((song, index) => {
    const played = song.playedAt ? `<t:${Math.floor(new Date(song.playedAt).getTime() / 1000)}:R>` : "unknown time";
    return `${index + 1}. **${song.title}** - ${song.artist || "Unknown"} (${song.durationFormatted || "0:00"}) • ${played}`;
  });

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Playback History")
    .setDescription(lines.join("\n") || "No playback history yet.")
    .setFooter({ text: `${history.length}/${PlaybackHistory.MAX_HISTORY} saved song(s)` })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("history")
    .setDescription("View or replay recently played songs")
    .addSubcommand((subcommand) => subcommand
      .setName("list")
      .setDescription("Show recently played songs"))
    .addSubcommand((subcommand) => subcommand
      .setName("play")
      .setDescription("Queue a song from playback history")
      .addIntegerOption((option) => option
        .setName("position")
        .setDescription("History position")
        .setMinValue(1)
        .setMaxValue(PlaybackHistory.MAX_HISTORY)
        .setRequired(true))),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const history = PlaybackHistory.read(interaction.guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      await interaction.editReply({ embeds: [buildHistoryEmbed(history)] });
      return;
    }

    const check = requireVoiceChannel(interaction);
    if (!check.ok) {
      await interaction.editReply(check.message);
      return;
    }

    const position = interaction.options.getInteger("position", true) - 1;
    const song = history[position];
    if (!song) {
      await interaction.editReply("No history entry at that position.");
      return;
    }

    const queue = client.player.getQueue(interaction.guildId);
    const wasEmpty = !queue.getCurrent();
    const queued = {
      ...PlaybackHistory.cleanSong(song),
      requestedBy: interaction.user.username
    };

    queue.add(queued);
    client.player.saveQueue(interaction.guildId);

    if (wasEmpty) {
      await client.player.play(interaction.guildId, check.voiceChannel, interaction.channel);
    } else {
      client.player.cancelDisconnectTimer(interaction.guildId);
      await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    }

    await interaction.editReply(`Queued **${queued.title}** from history.`);
  }
};
