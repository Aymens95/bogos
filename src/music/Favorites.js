const { dataPath, readJSON, writeJSON } = require("../utils/storage");

const MAX_FAVORITES = 50;

function filePath(userId) {
  return dataPath("favorites", `${userId}.json`);
}

function readFavorites(userId) {
  const data = readJSON(filePath(userId), { songs: [] });
  return Array.isArray(data.songs) ? data.songs : [];
}

function writeFavorites(userId, songs) {
  return writeJSON(filePath(userId), { songs });
}

function sameSong(a, b) {
  return a?.youtubeUrl && b?.youtubeUrl && a.youtubeUrl === b.youtubeUrl;
}

function sanitizeSong(song) {
  return {
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    durationFormatted: song.durationFormatted,
    albumArt: song.albumArt,
    youtubeUrl: song.youtubeUrl,
    source: song.source,
    addedAt: song.addedAt || new Date().toISOString()
  };
}

function isFavorite(userId, song) {
  return readFavorites(userId).some((favorite) => sameSong(favorite, song));
}

function toggleFavorite(userId, song) {
  const songs = readFavorites(userId);
  const index = songs.findIndex((favorite) => sameSong(favorite, song));

  if (index >= 0) {
    const [removed] = songs.splice(index, 1);
    return writeFavorites(userId, songs)
      ? { ok: true, favorited: false, song: removed, count: songs.length }
      : { ok: false };
  }

  if (songs.length >= MAX_FAVORITES) {
    return { ok: false, limitReached: true };
  }

  const favorite = sanitizeSong(song);
  songs.push(favorite);
  return writeFavorites(userId, songs)
    ? { ok: true, favorited: true, song: favorite, count: songs.length }
    : { ok: false };
}

module.exports = {
  MAX_FAVORITES,
  isFavorite,
  readFavorites,
  sanitizeSong,
  toggleFavorite,
  writeFavorites
};
