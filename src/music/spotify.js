const axios = require("axios");
const { formatDuration } = require("../utils/formatDuration");

let tokenCache = {
  token: null,
  expiresAt: 0
};

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 30000) return tokenCache.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials are required for Spotify links.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  tokenCache = {
    token: response.data.access_token,
    expiresAt: now + response.data.expires_in * 1000
  };

  return tokenCache.token;
}

async function spotifyGet(path, params = {}) {
  const token = await getAccessToken();
  const response = await axios.get(`https://api.spotify.com/v1${path}`, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

function isPremiumRequiredError(error) {
  const message = String(error.response?.data || error.message || "");
  return error.response?.status === 403 && message.includes("Active premium subscription required");
}

function premiumRequiredError(kind) {
  const error = new Error(`Spotify ${kind} metadata is blocked by Spotify for this app. Try a YouTube link or text search instead.`);
  error.publicMessage = `Spotify ${kind} links are currently blocked by Spotify for this app. Try a YouTube link or text search instead.`;
  return error;
}

function parseOEmbedTitle(value) {
  const raw = String(value || "").trim();
  const withoutSpotify = raw
    .replace(/\s*\|\s*Spotify\s*$/i, "")
    .replace(/\s+on Spotify\s*$/i, "")
    .trim();

  const songAndLyrics = withoutSpotify.match(/^(.*?)\s*-\s*song and lyrics by\s*(.*?)$/i);
  if (songAndLyrics) {
    return {
      title: songAndLyrics[1].trim(),
      artist: songAndLyrics[2].trim()
    };
  }

  const byArtist = withoutSpotify.match(/^(.*?)\s+by\s+(.*?)$/i);
  if (byArtist) {
    return {
      title: byArtist[1].trim(),
      artist: byArtist[2].trim()
    };
  }

  const dash = withoutSpotify.match(/^(.*?)\s*[-–—]\s*(.*?)$/);
  if (dash) {
    return {
      title: dash[1].trim(),
      artist: dash[2].trim()
    };
  }

  return {
    title: withoutSpotify || "Spotify track",
    artist: "Unknown Artist"
  };
}

function toTrackMetadata(track) {
  const artists = track.artists?.map((artist) => artist.name).join(", ") || "Unknown Artist";
  const duration = Math.round((track.duration_ms || 0) / 1000);

  return {
    title: track.name,
    artist: artists,
    album: track.album?.name || null,
    duration,
    durationFormatted: formatDuration(duration),
    albumArt: track.album?.images?.[0]?.url || null,
    source: "spotify"
  };
}

async function getTrackMetadata(trackId) {
  try {
    const track = await spotifyGet(`/tracks/${trackId}`);
    return toTrackMetadata(track);
  } catch (error) {
    if (!isPremiumRequiredError(error)) throw error;

    const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
    const response = await axios.get("https://open.spotify.com/oembed", {
      params: { url: spotifyUrl }
    });
    const parsed = parseOEmbedTitle(response.data.title);

    return {
      title: parsed.title,
      artist: parsed.artist,
      album: null,
      duration: 0,
      durationFormatted: "0:00",
      albumArt: response.data.thumbnail_url || null,
      source: "spotify",
      lowConfidence: true
    };
  }
}

async function getPlaylistTracks(playlistId) {
  let data;
  try {
    data = await spotifyGet(`/playlists/${playlistId}`, {
      fields: "name,tracks(total,items(track(name,duration_ms,artists(name),album(name,images))))",
      limit: 100
    });
  } catch (error) {
    if (isPremiumRequiredError(error)) throw premiumRequiredError("playlist");
    throw error;
  }

  const tracks = data.tracks.items
    .map((item) => item.track)
    .filter(Boolean)
    .map(toTrackMetadata);

  return {
    name: data.name || "Spotify playlist",
    total: data.tracks.total || tracks.length,
    tracks
  };
}

async function getAlbumTracks(albumId) {
  let album;
  try {
    album = await spotifyGet(`/albums/${albumId}`);
  } catch (error) {
    if (isPremiumRequiredError(error)) throw premiumRequiredError("album");
    throw error;
  }

  const tracks = album.tracks.items.slice(0, 100).map((track) => toTrackMetadata({
    ...track,
    album: {
      name: album.name,
      images: album.images
    }
  }));

  return {
    name: album.name || "Spotify album",
    total: album.tracks.total || tracks.length,
    tracks
  };
}

async function searchTrack(query) {
  const data = await spotifyGet("/search", { q: query, type: "track", limit: 1 });
  const track = data.tracks.items[0];
  return track ? toTrackMetadata(track) : null;
}

module.exports = {
  getAlbumTracks,
  getPlaylistTracks,
  getTrackMetadata,
  searchTrack
};
