const API_BASE = "https://lrclib.net/api";
const REQUEST_TIMEOUT_MS = 6000;
const MAX_LYRICS_LENGTH = 3900;

function cleanSearchValue(value) {
  return String(value || "")
    .replace(/\s*\([^)]*(official|audio|video|lyrics|visualizer|remaster|live)[^)]*\)/gi, "")
    .replace(/\s*\[[^\]]*(official|audio|video|lyrics|visualizer|remaster|live)[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripSyncTimestamps(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^(\[\d{1,2}:\d{2}(?:\.\d{1,3})?\])+/, "").trim())
    .filter(Boolean)
    .join("\n");
}

function truncateLyrics(value) {
  const text = String(value || "").trim();
  if (text.length <= MAX_LYRICS_LENGTH) return { text, truncated: false };

  const clipped = text.slice(0, MAX_LYRICS_LENGTH);
  const lastBreak = clipped.lastIndexOf("\n");
  return {
    text: `${clipped.slice(0, lastBreak > 1000 ? lastBreak : MAX_LYRICS_LENGTH - 20).trim()}\n\n...`,
    truncated: true
  };
}

function buildUrl(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

async function requestJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Bogos Discord Music Bot/1.0 (https://github.com/Aymens95/bogos)"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`LRCLIB request failed with status ${response.status}`);
  return response.json();
}

function pickLyrics(record) {
  if (!record || record.instrumental) return null;
  return record.plainLyrics || stripSyncTimestamps(record.syncedLyrics);
}

function normalizeResult(record) {
  const lyrics = pickLyrics(record);
  if (!lyrics) return null;

  const truncated = truncateLyrics(lyrics);
  return {
    title: record.trackName || record.name || "Unknown title",
    artist: record.artistName || "Unknown artist",
    album: record.albumName || null,
    lyrics: truncated.text,
    truncated: truncated.truncated
  };
}

async function findByMetadata({ title, artist, duration }) {
  const exact = await requestJson(buildUrl("/get", {
    track_name: cleanSearchValue(title),
    artist_name: cleanSearchValue(artist),
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : undefined
  }));

  const exactResult = normalizeResult(exact);
  if (exactResult) return exactResult;

  const query = [cleanSearchValue(title), cleanSearchValue(artist)].filter(Boolean).join(" ");
  if (!query) return null;

  const results = await requestJson(buildUrl("/search", { q: query }));
  if (!Array.isArray(results)) return null;

  return results.map(normalizeResult).find(Boolean) || null;
}

async function findByQuery(query) {
  const cleaned = cleanSearchValue(query);
  if (!cleaned) return null;

  const results = await requestJson(buildUrl("/search", { q: cleaned }));
  if (!Array.isArray(results)) return null;

  return results.map(normalizeResult).find(Boolean) || null;
}

async function findLyrics({ query, song }) {
  if (query) {
    return findByQuery(query);
  }

  if (!song) return null;
  return findByMetadata({
    title: song.title,
    artist: song.artist,
    duration: song.duration
  });
}

module.exports = {
  findLyrics
};
