const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const Equalizer = require("../music/Equalizer");
const Favorites = require("../music/Favorites");
const { formatDuration } = require("./formatDuration");

function buildProgressBar(queue) {
  const song = queue.getCurrent();
  if (!song || !song.duration || song.duration <= 0 || queue.paused) return null;

  const elapsed = queue.startedAt
    ? Math.min((queue.seekOffset || 0) + Math.floor((Date.now() - queue.startedAt) / 1000), song.duration)
    : (queue.seekOffset || 0);

  const progress = elapsed / song.duration;
  const filled = Math.round(progress * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);

  return `\`[${bar}]\` ${formatDuration(elapsed)} / ${song.durationFormatted || formatDuration(song.duration)}`;
}

function getQueueTotalDuration(queue) {
  const seconds = queue.getAll().reduce((total, song) => {
    const duration = Number(song.duration || 0);
    return Number.isFinite(duration) && duration > 0 ? total + duration : total;
  }, 0);

  return seconds > 0 ? formatDuration(seconds) : "Unknown";
}

function buildNowPlayingPayload(queue, disabled = false, page = 1, guildId = null, userId = null) {
  const song = queue.getCurrent();
  const filter = guildId ? Equalizer.getFilter(guildId) : "Normal";
  const isFavorited = userId && song ? Favorites.isFavorite(userId, song) : false;
  const progressBar = song ? buildProgressBar(queue) : null;
  const linkLine = song ? (song.youtubeUrl ? `[Open on YouTube](${song.youtubeUrl})` : "Resolving YouTube match...") : "Queue is empty.";
  const description = progressBar ? `${progressBar}\n${linkLine}` : linkLine;

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(song?.title || "Nothing playing")
    .setDescription(description)
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
    description: `${item.artist || "Unknown"} • ${item.unresolved ? "pending" : item.durationFormatted || "0:00"}`.slice(0, 100),
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

function buildSearchResultsPayload({ query, candidates, userId }) {
  const embed = new EmbedBuilder()
    .setColor(0x00a8ff)
    .setTitle("Search Results")
    .setDescription(candidates.map((candidate, index) => {
      const duration = candidate.durationFormatted || "0:00";
      return `${index + 1}. **${candidate.title}** - ${candidate.artist || "Unknown"} (${duration})`;
    }).join("\n") || "No results found.")
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`search_select:${userId}`)
      .setPlaceholder(`Choose a result for ${query}`.slice(0, 100))
      .setDisabled(!candidates.length)
      .addOptions(candidates.length ? candidates.map((candidate, index) => ({
        label: `${index + 1}. ${candidate.title}`.slice(0, 100),
        description: `${candidate.artist || "Unknown"} • ${candidate.durationFormatted || "0:00"}`.slice(0, 100),
        value: String(index)
      })) : [{ label: "No results", value: "empty" }])
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

function buildQueuePayload(queue, page = 1) {
  const totalPages = queue.getTotalPages();
  const safePage = Math.min(Math.max(1, page), totalPages);
  const current = queue.getCurrent();
  const items = queue.getPage(safePage);
  const lines = items.map((item) => {
    const marker = item.position - 1 === queue.currentIndex ? "▶" : `${item.position}.`;
    const duration = item.unresolved ? "pending" : item.durationFormatted || "0:00";
    return `${marker} **${item.title || "Unknown title"}** - ${item.artist || "Unknown"} (${duration})`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Queue")
    .setDescription(lines.join("\n").slice(0, 4000) || "Queue is empty.")
    .addFields(
      { name: "Songs", value: String(queue.songs.length), inline: true },
      { name: "Page", value: `${safePage}/${totalPages}`, inline: true },
      { name: "Total duration", value: getQueueTotalDuration(queue), inline: true },
      { name: "Current", value: current?.title?.slice(0, 1024) || "Nothing playing", inline: false }
    )
    .setFooter({ text: `Loop: ${queue.loopMode} • Volume: ${queue.volume}% • Autoplay: ${queue.autoplay ? "on" : "off"}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue_view:first:${safePage}`)
      .setLabel("First")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 1),
    new ButtonBuilder()
      .setCustomId(`queue_view:prev:${safePage}`)
      .setEmoji("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage <= 1),
    new ButtonBuilder()
      .setCustomId(`queue_view:next:${safePage}`)
      .setEmoji("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages),
    new ButtonBuilder()
      .setCustomId(`queue_view:last:${safePage}`)
      .setLabel("Last")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages)
  );

  return {
    embeds: [embed],
    components: queue.songs.length ? [row] : []
  };
}

module.exports = {
  buildAddedToQueueEmbed,
  buildNowPlayingPayload,
  buildQueuePayload,
  buildSearchResultsPayload
};
