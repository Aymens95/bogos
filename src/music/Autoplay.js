const ytdlp = require("./ytdlp");
const { formatDuration } = require("../utils/formatDuration");

function extractVideoId(youtubeUrl) {
  try {
    const url = new URL(youtubeUrl);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    return url.searchParams.get("v");
  } catch {
    return null;
  }
}

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

function makeSong(candidate) {
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

async function getNextSong(queue) {
  if (!queue.autoplay) return null;
  if (queue.autoplayCount >= MAX_AUTOPLAY_ADDITIONS) return null;

  const seed = queue.history[queue.history.length - 1] || queue.getCurrent();
  if (!seed?.title) return null;

  const seenKeys = new Set([
    ...queue.songs.map(songKey),
    ...queue.history.slice(-25).map(songKey)
  ]);

  // Try YouTube Mix/Radio for more accurate related songs
  if (seed.youtubeUrl) {
    const videoId = extractVideoId(seed.youtubeUrl);
    if (videoId) {
      try {
        const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
        const playlist = await ytdlp.getYouTubePlaylist(mixUrl);
        const shuffled = playlist.videos.slice().sort(() => Math.random() - 0.5);
        for (const video of shuffled) {
          const candidate = { url: video.url, title: video.title, artist: video.artist, duration: video.duration, thumbnail: video.thumbnail };
          if (isUsableCandidate(candidate, seenKeys)) {
            queue.autoplayCount += 1;
            return makeSong(candidate);
          }
        }
      } catch {
        // Fall through to text search
      }
    }
  }

  const candidates = await ytdlp.getYouTubeCandidates(buildQuery(seed), 10);
  const candidate = candidates.find((item) => isUsableCandidate(item, seenKeys));
  if (!candidate) return null;

  queue.autoplayCount += 1;
  return makeSong(candidate);
}

module.exports = {
  getNextSong,
  MAX_AUTOPLAY_ADDITIONS
};
