const { requireSameVoiceChannel } = require("../utils/voiceChecks");
const { formatDuration } = require("../utils/formatDuration");
const VoteSkip = require("../music/VoteSkip");

const SEARCH_TTL_MS = 10 * 60 * 1000;
const pendingSearches = new Map();

function setPendingSearch(messageId, candidates) {
  pendingSearches.set(messageId, {
    candidates,
    expiresAt: Date.now() + SEARCH_TTL_MS
  });
}

function getPendingSearch(messageId) {
  const entry = pendingSearches.get(messageId);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    pendingSearches.delete(messageId);
    return null;
  }

  return entry;
}

async function handleQueueSelect(interaction, client) {
  if (!interaction.customId.startsWith("queue_select:")) return;

  const voiceCheck = requireSameVoiceChannel(interaction, client);
  if (!voiceCheck.ok) {
    await interaction.reply({ content: voiceCheck.message, flags: 64 });
    return;
  }

  const selected = interaction.values[0];
  if (selected === "empty") {
    await interaction.deferUpdate();
    return;
  }

  const queue = client.player.getQueue(interaction.guildId);
  const index = Number(selected);

  if (!queue.jumpTo(index)) {
    await interaction.reply({ content: "That queue entry no longer exists.", flags: 64 });
    return;
  }

  await interaction.deferUpdate();
  VoteSkip.clear(interaction.guildId);
  client.player.saveQueue(interaction.guildId);
  await client.player.playCurrent(interaction.guildId);
}

async function handleSearchSelect(interaction, client) {
  if (!interaction.customId.startsWith("search_select:")) return;

  const [, ownerId] = interaction.customId.split(":");
  if (ownerId && interaction.user.id !== ownerId) {
    await interaction.reply({ content: "Only the user who ran this search can choose a result.", flags: 64 });
    return;
  }

  const voiceCheck = requireSameVoiceChannel(interaction, client);
  if (!voiceCheck.ok) {
    await interaction.reply({ content: voiceCheck.message, flags: 64 });
    return;
  }

  const selected = interaction.values[0];
  if (selected === "empty") {
    await interaction.deferUpdate();
    return;
  }

  const pending = getPendingSearch(interaction.message.id);
  if (!pending) {
    await interaction.update({ content: "This search has expired. Run `/search` again.", embeds: [], components: [] });
    return;
  }

  const candidate = pending.candidates[Number(selected)];
  if (!candidate) {
    await interaction.reply({ content: "That search result is no longer available.", flags: 64 });
    return;
  }

  await interaction.deferUpdate();
  pendingSearches.delete(interaction.message.id);

  const song = {
    title: candidate.title,
    artist: candidate.artist,
    duration: candidate.duration,
    durationFormatted: candidate.durationFormatted || formatDuration(candidate.duration),
    albumArt: candidate.thumbnail || null,
    youtubeUrl: candidate.url,
    requestedBy: interaction.user.username,
    source: "youtube",
    unresolved: false
  };

  const queue = client.player.getQueue(interaction.guildId);
  const wasEmpty = !queue.getCurrent();
  queue.add(song);
  client.player.saveQueue(interaction.guildId);

  await interaction.editReply({
    content: `Queued **${song.title}**.`,
    embeds: [],
    components: []
  });

  if (wasEmpty) {
    await client.player.play(interaction.guildId, voiceCheck.voiceChannel, interaction.channel);
  } else {
    client.player.cancelDisconnectTimer(interaction.guildId);
    await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
  }
}

module.exports = {
  handleQueueSelect,
  handleSearchSelect,
  setPendingSearch
};
