const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const Equalizer = require("../music/Equalizer");
const Favorites = require("../music/Favorites");

function buildNowPlayingPayload(queue, disabled = false, page = 1, guildId = null, userId = null) {
  const song = queue.getCurrent();
  const filter = guildId ? Equalizer.getFilter(guildId) : "Normal";
  const isFavorited = userId && song ? Favorites.isFavorite(userId, song) : false;
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(song?.title || "Nothing playing")
    .setDescription(song ? `[Open on YouTube](${song.youtubeUrl})` : "Queue is empty.")
    .addFields(
      { name: "Artist", value: song?.artist || "Unknown", inline: true },
      { name: "Duration", value: song?.durationFormatted || "0:00", inline: true },
      { name: "Requested by", value: song?.requestedBy || "Unknown", inline: true },
      { name: "Autoplay", value: queue.autoplay ? "Enabled" : "Disabled", inline: true },
      { name: "Loop", value: queue.loopMode, inline: true },
      { name: "Volume", value: `${queue.volume}%`, inline: true },
      { name: "Filter", value: filter === "Normal" ? "Off" : filter, inline: true }
    )
    .setTimestamp();

  if (song?.albumArt) embed.setThumbnail(song.albumArt);

  const paused = queue.paused;
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_shuffle").setLabel("Shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_previous").setLabel("Previous").setEmoji("⏮").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_pause_resume").setLabel(paused ? "Resume" : "Pause").setEmoji(paused ? "▶" : "⏸").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_skip").setLabel("Skip").setEmoji("⏭").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_loop").setLabel("Loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_remove").setLabel("Remove").setEmoji("🗑️").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_rewind").setLabel("Rewind").setEmoji("⏪").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_stop").setLabel("Stop").setEmoji("⏹").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId("btn_forward").setLabel("Forward").setEmoji("⏩").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("btn_favorite")
      .setLabel(isFavorited ? "Favorited" : "Favorite")
      .setEmoji(isFavorited ? "🩷" : "❤️")
      .setStyle(isFavorited ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(disabled || !song)
  );

  const options = queue.getPage(page).map((item) => ({
    label: `${item.position}. ${item.title}`.slice(0, 100),
    description: `${item.artist || "Unknown"} • ${item.durationFormatted || "0:00"}`.slice(0, 100),
    value: String(item.position - 1)
  }));

  const row3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`queue_select:${page}`)
      .setPlaceholder(`Queue - Page ${page} of ${queue.getTotalPages()}`)
      .setDisabled(disabled || options.length === 0)
      .addOptions(options.length ? options : [{ label: "Queue is empty", value: "empty" }])
  );

  const totalPages = queue.getTotalPages();
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`queue_page:prev:${Math.max(1, page - 1)}`).setLabel("Previous Page").setEmoji("◀").setStyle(ButtonStyle.Secondary).setDisabled(disabled || page <= 1),
    new ButtonBuilder().setCustomId(`queue_page:next:${Math.min(totalPages, page + 1)}`).setLabel("Next Page").setEmoji("▶").setStyle(ButtonStyle.Secondary).setDisabled(disabled || page >= totalPages)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3, row4]
  };
}

function sourceLinkLabel(sourceUrl) {
  if (/^https?:\/\//i.test(sourceUrl)) return "Original link";
  return "Resolved YouTube link";
}

function buildAddedToQueueEmbed({ query, result, user }) {
  const count = result.songs.length;
  const isCollection = Boolean(result.collectionName) || count > 1;
  const firstSong = result.songs[0];
  const sourceUrl = /^https?:\/\//i.test(query) ? query : firstSong?.youtubeUrl;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Added to Queue")
    .setTimestamp();

  if (user) {
    embed.setFooter({
      text: user.username,
      iconURL: user.displayAvatarURL?.() || undefined
    });
  }

  if (isCollection) {
    const totalTracks = result.totalTracks || count;
    const tracksValue = totalTracks > count
      ? `${count} of ${totalTracks} songs added to the queue`
      : `${count} songs added to the queue`;

    embed.addFields(
      { name: "Playlist", value: result.collectionName || "Playlist / Album", inline: true },
      { name: "Tracks", value: tracksValue, inline: true }
    );
  } else {
    embed.addFields(
      { name: "Title", value: firstSong?.title || "Unknown title", inline: true },
      { name: "Artist", value: firstSong?.artist || "Unknown artist", inline: true },
      { name: "Duration", value: firstSong?.durationFormatted || "0:00", inline: true }
    );
  }

  if (sourceUrl) {
    embed.addFields({
      name: "Source link",
      value: `[${sourceLinkLabel(query)}](${sourceUrl})`,
      inline: false
    });
  }

  if (firstSong?.albumArt) embed.setThumbnail(firstSong.albumArt);

  return embed;
}

module.exports = {
  buildAddedToQueueEmbed,
  buildNowPlayingPayload
};
