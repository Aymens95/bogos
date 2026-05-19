const { SlashCommandBuilder } = require("discord.js");
const { resolveInput } = require("../../music/resolveInput");
const { buildAddedToQueueEmbed } = require("../../utils/embedBuilder");
const { takeQueueableSongs } = require("../../utils/queueLimits");
const { getPreferredTextChannel } = require("../../utils/textChannel");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song by name, Spotify link, or YouTube link")
    .addStringOption((option) => option
      .setName("query")
      .setDescription("Song name, Spotify link, or YouTube link")
      .setRequired(true)),
  async execute(interaction, client) {
    const voiceCheck = requireVoiceChannel(interaction);
    if (!voiceCheck.ok) {
      await interaction.reply({ content: voiceCheck.message, flags: 64 });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query", true);
    const result = await resolveInput(query, interaction.user.username);
    const queue = client.player.getQueue(interaction.guildId);
    const wasEmpty = !queue.getCurrent();
    const textChannel = getPreferredTextChannel(interaction);
    const queueable = takeQueueableSongs(interaction.guildId, queue, result.songs);
    if (!queueable.songs.length) {
      await interaction.editReply(`Queue is already at this server's ${queueable.maxQueueSize} song limit.`);
      return;
    }

    result.songs = queueable.songs;
    result.truncated = result.truncated || queueable.truncated;
    queue.addMany(result.songs);
    client.player.saveQueue(interaction.guildId);
    const count = result.songs.length;
    await interaction.editReply(`${count === 1 ? "Queued" : `Queued ${count} songs`}${result.truncated ? " (first 100 only)" : ""}.`);
    await textChannel.send({
      embeds: [buildAddedToQueueEmbed({ query, result, user: interaction.user })]
    });

    if (wasEmpty) {
      await client.player.play(interaction.guildId, voiceCheck.voiceChannel, textChannel);
    } else {
      client.player.cancelDisconnectTimer(interaction.guildId);
      await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    }
  }
};
