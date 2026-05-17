const { extractId, parseInput } = require("../utils/linkParser");
const { formatDuration } = require("../utils/formatDuration");
const spotify = require("./spotify");
const ytdlp = require("./ytdlp");

async function metadataFromYouTube(url, requestedBy) {
  const info = await ytdlp.getVideoInfo(url);
  const duration = Number(info.duration || 0);

  return {
    title: info.title || "YouTube video",
    artist: info.uploader || "YouTube",
    duration,
    durationFormatted: formatDuration(duration),
    albumArt: info.thumbnail || null,
    youtubeUrl: url,
    requestedBy,
    source: "youtube"
  };
}

async function withYouTube(metadata, requestedBy) {
  const searchQuery = metadata.artist && metadata.artist !== "Unknown Artist"
    ? `${metadata.title} ${metadata.artist}`
    : metadata.title;
  const youtubeUrl = metadata.youtubeUrl || await ytdlp.searchYouTube(searchQuery);
  if (!youtubeUrl) throw new Error("Could not find audio for this track.");

  return {
    ...metadata,
    youtubeUrl,
    requestedBy,
    durationFormatted: metadata.durationFormatted || formatDuration(metadata.duration),
    source: metadata.source || "search"
  };
}

async function resolveInput(input, requestedBy) {
  const parsed = parseInput(input);

  if (parsed.type === "spotify_track") {
    const trackId = extractId(parsed.value, "track");
    if (!trackId) throw new Error("Invalid Spotify track URL.");
    return { songs: [await withYouTube(await spotify.getTrackMetadata(trackId), requestedBy)] };
  }

  if (parsed.type === "spotify_playlist") {
    const playlistId = extractId(parsed.value, "playlist");
    if (!playlistId) throw new Error("Invalid Spotify playlist URL.");
    const playlist = await spotify.getPlaylistTracks(playlistId);
    const songs = [];
    for (const track of playlist.tracks) songs.push(await withYouTube(track, requestedBy));
    return {
      collectionName: playlist.name,
      songs,
      totalTracks: playlist.total,
      truncated: playlist.total > songs.length
    };
  }

  if (parsed.type === "spotify_album") {
    const albumId = extractId(parsed.value, "album");
    if (!albumId) throw new Error("Invalid Spotify album URL.");
    const album = await spotify.getAlbumTracks(albumId);
    const songs = [];
    for (const track of album.tracks) songs.push(await withYouTube(track, requestedBy));
    return {
      collectionName: album.name,
      songs,
      totalTracks: album.total,
      truncated: album.total > songs.length
    };
  }

  if (parsed.type === "youtube_playlist") {
    const playlist = await ytdlp.getYouTubePlaylist(parsed.value);
    const songs = [];
    for (const url of playlist.urls) songs.push(await metadataFromYouTube(url, requestedBy));
    return {
      collectionName: "YouTube playlist",
      songs,
      totalTracks: playlist.total,
      truncated: playlist.total > songs.length
    };
  }

  if (parsed.type === "youtube_video") {
    return { songs: [await metadataFromYouTube(parsed.value, requestedBy)] };
  }

  const youtubeUrl = await ytdlp.searchYouTube(parsed.value);
  if (!youtubeUrl) throw new Error("Could not find audio for this track.");
  return { songs: [await metadataFromYouTube(youtubeUrl, requestedBy)] };
}

module.exports = {
  resolveInput
};
