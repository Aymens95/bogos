const { AudioPlayerStatus, getVoiceConnection } = require("@discordjs/voice");
const { EmbedBuilder, SlashCommandBuilder, version: discordJsVersion } = require("discord.js");
const Equalizer = require("../../music/Equalizer");
const { getRuntimeDiagnostics } = require("../../utils/diagnostics");

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${seconds}s`);
  return parts.join(" ");
}

function truncate(value, maxLength = 256) {
  const text = String(value || "Unknown");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatBinaryStatus(result) {
  const prefix = result.available ? "Available" : "Unavailable";
  return `${prefix} (${truncate(result.detail, 80)})`;
}

function getPlaybackState(client, guildId) {
  const player = client.player.players.get(guildId);
  return player?.state?.status || AudioPlayerStatus.Idle;
}

function getQueueSnapshot(client, guildId) {
  const queue = client.player.queues.get(guildId);
  if (queue) return queue;

  return {
    songs: [],
    loopMode: "off",
    volume: 50,
    getCurrent: () => null
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show Bogos diagnostics for this server"),
  async execute(interaction, client) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use /status in a server.", flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const queue = getQueueSnapshot(client, interaction.guildId);
    const song = queue.getCurrent();
    const connection = getVoiceConnection(interaction.guildId) || client.player.connections.get(interaction.guildId);
    const diagnostics = await getRuntimeDiagnostics();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Bogos Status")
      .addFields(
        { name: "Bot uptime", value: formatUptime(process.uptime()), inline: true },
        { name: "WebSocket ping", value: `${client.ws.ping}ms`, inline: true },
        { name: "Voice connection", value: connection?.state?.status || "Disconnected", inline: true },
        { name: "Playback state", value: getPlaybackState(client, interaction.guildId), inline: true },
        { name: "Queue length", value: String(queue.songs.length), inline: true },
        { name: "Current song", value: truncate(song?.title || "Nothing playing"), inline: true },
        { name: "Loop mode", value: queue.loopMode, inline: true },
        { name: "Equalizer", value: Equalizer.getFilter(interaction.guildId), inline: true },
        { name: "Volume", value: `${queue.volume}%`, inline: true },
        { name: "FFmpeg", value: formatBinaryStatus(diagnostics.ffmpeg), inline: false },
        { name: "yt-dlp", value: formatBinaryStatus(diagnostics.ytdlp), inline: false },
        { name: "Node.js", value: diagnostics.nodeVersion, inline: true },
        { name: "discord.js", value: discordJsVersion, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
