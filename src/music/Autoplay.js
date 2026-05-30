const ytdlp = require("./ytdlp");
const { formatDuration } = require("../utils/formatDuration");

const MAX_AUTOPLAY_ADDITIONS = 10;
const MIN_DURATION_SECONDS = 45;
const MAX_DURATION_SECONDS = 20 * 60;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function songKey(song) {
  return normalize(song?.youtubeUrl || `${song?.title || ""} ${song?.artist || ""}`);
}

function buildQuery(seed) {
  const artist = seed.artist && !/^unknown/i.test(seed.artist) ? seed.artist : "";
  if (artist) return `${artist} songs`;
  return `${seed.title} similar songs`;
}

function isUsableCandidate(candidate, seenKeys) {
  if (!candidate?.url || !candidate.title) return false;
  if (candidate.duration && (candidate.duration < MIN_DURATION_SECONDS || candidate.duration > MAX_DURATION_SECONDS)) return false;

  const key = songKey({ youtubeUrl: candidate.url, title: candidate.title, artist: candidate.artist });
  if (seenKeys.has(key)) return false;

  const text = normalize(`${candidate.title} ${candidate.artist}`);
  return !/\b(reaction|trailer|review|interview|tutorial|karaoke|instrumental)\b/.test(text);
}

async function getNextSong(queue) {
  if (!queue.autoplay) return null;
  if (queue.autoplayCount >= MAX_AUTOPLAY_ADDITIONS) return null;

  const seed = queue.history[queue.history.length - 1] || queue.getCurrent();
  if (!seed?.title) return null;

  const seenKeys = new Set([
    ...queue.songs.map(songKey),
    ...queue.history.slice(-25).map(songKey)
  ]);

  const candidates = await ytdlp.getYouTubeCandidates(buildQuery(seed), 10);
  const candidate = candidates.find((item) => isUsableCandidate(item, seenKeys));
  if (!candidate) return null;

  queue.autoplayCount += 1;
  return {
    title: candidate.title,
    artist: candidate.artist || "YouTube",
    duration: candidate.duration || 0,
    durationFormatted: candidate.durationFormatted || formatDuration(candidate.duration || 0),
    albumArt: candidate.thumbnail || null,
    youtubeUrl: candidate.url,
    requestedBy: "Autoplay",
    source: "autoplay",
    unresolved: false,
    autoplay: true
  };
}

module.exports = {
  getNextSong,
  MAX_AUTOPLAY_ADDITIONS
};
