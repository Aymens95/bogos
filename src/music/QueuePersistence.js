const fs = require("node:fs");
const { LOOP_MODES } = require("../utils/constants");
const logger = require("../utils/logger");
const { dataPath, readJSON, writeJSON } = require("../utils/storage");

function filePath(guildId) {
  return dataPath("queues", `${guildId}.json`);
}

function cleanSong(song) {
  return {
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    durationFormatted: song.durationFormatted,
    albumArt: song.albumArt,
    youtubeUrl: song.youtubeUrl,
    requestedBy: song.requestedBy,
    source: song.source,
    unresolved: song.unresolved,
    searchQuery: song.searchQuery
  };
}

function normalizeState(state) {
  const songs = Array.isArray(state?.songs) ? state.songs.filter((song) => song && song.title).map(cleanSong) : [];
  const currentIndex = Number.isInteger(state?.currentIndex)
    ? Math.min(Math.max(0, state.currentIndex), Math.max(0, songs.length - 1))
    : 0;
  const loopMode = Object.values(LOOP_MODES).includes(state?.loopMode) ? state.loopMode : LOOP_MODES.OFF;
  const volume = Number.isInteger(state?.volume) ? Math.max(1, Math.min(100, state.volume)) : 50;

  return {
    songs,
    currentIndex,
    loopMode,
    volume,
    autoplay: Boolean(state?.autoplay),
    savedAt: state?.savedAt || null
  };
}

function exportQueue(queue) {
  return normalizeState({
    songs: queue.getAll().map(cleanSong),
    currentIndex: queue.currentIndex,
    loopMode: queue.loopMode,
    volume: queue.volume,
    autoplay: queue.autoplay,
    savedAt: new Date().toISOString()
  });
}

function applyState(queue, state) {
  const normalized = normalizeState(state);
  queue.songs = normalized.songs;
  queue.currentIndex = normalized.currentIndex;
  queue.history = [];
  queue.loopMode = normalized.loopMode;
  queue.volume = normalized.volume;
  queue.autoplay = normalized.autoplay;
  return normalized;
}

function save(guildId, queue) {
  const state = exportQueue(queue);
  if (!state.songs.length) return clear(guildId);
  return writeJSON(filePath(guildId), state);
}

function load(guildId) {
  return normalizeState(readJSON(filePath(guildId), {}));
}

function clear(guildId) {
  try {
    const target = filePath(guildId);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return true;
  } catch (error) {
    logger.error("Could not delete persisted queue", { guildId, error: error.message });
    return false;
  }
}

module.exports = {
  applyState,
  clear,
  load,
  save
};
