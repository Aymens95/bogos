const { dataPath, readJSON, writeJSON } = require("../utils/storage");

const MAX_HISTORY = 50;

function filePath(guildId) {
  return dataPath("history", `${guildId}.json`);
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

function read(guildId) {
  const history = readJSON(filePath(guildId), []);
  return Array.isArray(history)
    ? history.filter((entry) => entry?.title).slice(0, MAX_HISTORY)
    : [];
}

function write(guildId, history) {
  return writeJSON(filePath(guildId), history.slice(0, MAX_HISTORY));
}

function add(guildId, song) {
  if (!song?.title) return false;

  const entry = {
    ...cleanSong(song),
    playedAt: new Date().toISOString()
  };

  const history = read(guildId);
  const nextHistory = [
    entry,
    ...history.filter((item) => item.youtubeUrl !== entry.youtubeUrl || !entry.youtubeUrl)
  ].slice(0, MAX_HISTORY);

  return write(guildId, nextHistory);
}

module.exports = {
  add,
  cleanSong,
  read,
  write,
  MAX_HISTORY
};
