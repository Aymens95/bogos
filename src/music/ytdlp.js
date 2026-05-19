const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");
const { selectBestCandidate } = require("./matcher");

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
  });
}

async function searchYouTube(query) {
  const candidates = await getYouTubeCandidates(query);

  for (const candidate of candidates) {
    try {
      await getAudioUrl(candidate.url);
      return candidate.url;
    } catch {
      // Try the next search result if this video is unavailable.
    }
  }

  return null;
}

async function searchYouTubeForTrack(track) {
  const query = track.searchQuery || (
    track.artist && track.artist !== "Unknown Artist"
      ? `${track.title} ${track.artist}`
      : track.title
  );
  const candidates = await getYouTubeCandidates(query);
  const best = selectBestCandidate(track, candidates);
  const ordered = [
    best,
    ...candidates.filter((candidate) => candidate.url !== best?.url)
  ].filter(Boolean);

  for (const candidate of ordered) {
    try {
      await getAudioUrl(candidate.url);
      return candidate.url;
    } catch {
      // Try the next ranked result if this video is unavailable.
    }
  }

  return null;
}

async function getYouTubeCandidates(query, limit = 5) {
  try {
    const result = await runYtdlp([
      "--dump-json",
      "--no-playlist",
      `ytsearch${limit}:${query}`
    ]);

    return result
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .map((entry) => ({
        title: entry.title || "YouTube video",
        artist: entry.uploader || entry.channel || "YouTube",
        duration: Number(entry.duration || 0),
        thumbnail: entry.thumbnail || null,
        url: entry.webpage_url || entry.original_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null)
      }))
      .filter((candidate) => candidate.url);
  } catch {
    // Fall back to the old flat ID path if metadata search fails.
  }

  const result = await runYtdlp([
    "--default-search",
    `ytsearch${limit}`,
    "--flat-playlist",
    "--get-id",
    "--no-playlist",
    query
  ]);

  const fallbackCandidates = result
    .split(/\r?\n/)
    .filter(Boolean)
    .map((id) => ({
      title: "YouTube video",
      artist: "YouTube",
      duration: 0,
      url: `https://www.youtube.com/watch?v=${id}`
    }));

  const enriched = await Promise.all(fallbackCandidates.map(async (candidate) => {
    try {
      const info = await getVideoInfo(candidate.url);
      return {
        ...candidate,
        title: info.title || candidate.title,
        artist: info.uploader || info.channel || candidate.artist,
        duration: Number(info.duration || candidate.duration),
        thumbnail: info.thumbnail || null
      };
    } catch {
      return candidate;
    }
  }));

  const usable = enriched.filter((candidate) => candidate.title !== "YouTube video" || candidate.artist !== "YouTube");
  return usable.length ? usable : enriched;
}

async function getAudioUrl(youtubeUrl) {
  return runYtdlp(["-f", "bestaudio", "-g", "--no-playlist", youtubeUrl]);
}

async function getYouTubePlaylist(playlistUrl) {
  const result = await runYtdlp(["--flat-playlist", "--playlist-end", "100", "--dump-single-json", playlistUrl]);
  const playlist = JSON.parse(result);
  const entries = Array.isArray(playlist.entries) ? playlist.entries.filter(Boolean) : [];
  const videos = entries
    .map((entry) => {
      const id = entry.id || entry.url;
      if (!id) return null;

      const url = /^https?:\/\//i.test(id)
        ? id
        : `https://www.youtube.com/watch?v=${id}`;

      return {
        title: entry.title || "YouTube video",
        artist: entry.uploader || entry.channel || "YouTube",
        duration: Number(entry.duration || 0),
        thumbnail: entry.thumbnail || null,
        url
      };
    })
    .filter(Boolean);

  return {
    videos: videos.slice(0, 100),
    total: Number(playlist.playlist_count || playlist.n_entries || videos.length)
  };
}

async function getAudioStream(youtubeUrl) {
  const audioUrl = await getAudioUrl(youtubeUrl);
  return Readable.fromWeb(await fetch(audioUrl).then((response) => {
    if (!response.ok) throw new Error(`Audio stream request failed: ${response.status}`);
    return response.body;
  }));
}

async function getVideoInfo(youtubeUrl) {
  const json = await runYtdlp(["--dump-single-json", "--no-playlist", youtubeUrl]);
  return JSON.parse(json);
}

module.exports = {
  getAudioStream,
  getAudioUrl,
  getVideoInfo,
  getYouTubeCandidates,
  getYouTubePlaylist,
  searchYouTube,
  searchYouTubeForTrack
};
