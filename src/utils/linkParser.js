function parseInput(input) {
  const query = String(input || "").trim();

  if (/open\.spotify\.com\/track\//i.test(query)) return { type: "spotify_track", value: query };
  if (/open\.spotify\.com\/playlist\//i.test(query)) return { type: "spotify_playlist", value: query };
  if (/open\.spotify\.com\/album\//i.test(query)) return { type: "spotify_album", value: query };
  if (/youtube\.com\/playlist/i.test(query)) return { type: "youtube_playlist", value: query };
  if (/youtube\.com\/watch|youtu\.be\//i.test(query)) return { type: "youtube_video", value: query };

  return { type: "search", value: query };
}

function extractId(url, marker) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const index = parts.indexOf(marker);
    return index >= 0 ? parts[index + 1] : null;
  } catch {
    return null;
  }
}

module.exports = {
  extractId,
  parseInput
};
