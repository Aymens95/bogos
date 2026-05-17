const { spawn } = require("node:child_process");
const { Readable } = require("node:stream");

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
  const result = await runYtdlp([
    "--default-search",
    "ytsearch5",
    "--flat-playlist",
    "--get-id",
    "--no-playlist",
    query
  ]);

  const ids = result.split(/\r?\n/).filter(Boolean);

  for (const id of ids) {
    const url = `https://www.youtube.com/watch?v=${id}`;
    try {
      await getAudioUrl(url);
      return url;
    } catch {
      // Try the next search result if this video is unavailable.
    }
  }

  return null;
}

async function getAudioUrl(youtubeUrl) {
  return runYtdlp(["-f", "bestaudio", "-g", "--no-playlist", youtubeUrl]);
}

async function getYouTubePlaylist(playlistUrl) {
  const result = await runYtdlp(["--flat-playlist", "--get-id", playlistUrl]);
  const urls = result
    .split(/\r?\n/)
    .filter(Boolean)
    .map((id) => `https://www.youtube.com/watch?v=${id}`);

  return {
    urls: urls.slice(0, 100),
    total: urls.length
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
  getYouTubePlaylist,
  searchYouTube
};
