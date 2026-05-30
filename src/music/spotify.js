const axios = require("axios");
const { formatDuration } = require("../utils/formatDuration");
const logger = require("../utils/logger");

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
    const error = new Error("Spotify credentials are not configured.");
    error.code = "SPOTIFY_CREDENTIALS_MISSING";
    throw error;
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

function hasCredentials() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

function isMissingCredentialsError(error) {
  return error?.code === "SPOTIFY_CREDENTIALS_MISSING";
}

function spotifyCollectionUnavailableError(kind) {
  const error = new Error(`Spotify ${kind} metadata is unavailable. Try a YouTube link or text search instead.`);
  error.publicMessage = `Spotify ${kind} links are currently unavailable. Try a YouTube link or text search instead.`;
  return error;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, ""));
}

function parseDuration(value) {
  const parts = String(value || "").split(":").map((part) => Number(part));
  if (parts.length === 2 && parts.every(Number.isInteger)) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && parts.every(Number.isInteger)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function parseEmbedTracks(html, albumArt = null) {
  const rows = [...String(html || "").matchAll(/<li\b[^>]*data-testid="tracklist-row-\d+"[\s\S]*?<\/li>/g)];
  return rows.slice(0, 100).map((row) => {
    const chunk = row[0];
    const title = stripTags(chunk.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]);
    const artist = stripTags(chunk.match(/<h4\b[^>]*>([\s\S]*?)<\/h4>/)?.[1]).replace(/^E\s+/, "").trim() || "Unknown Artist";
    const durationText = stripTags(chunk.match(/data-testid="duration-cell"[^>]*>([\s\S]*?)<\/div>/)?.[1]);
    const duration = parseDuration(durationText);

    if (!title) return null;

    return {
      title,
      artist,
      album: null,
      duration,
      durationFormatted: duration ? formatDuration(duration) : "0:00",
      albumArt,
      source: "spotify",
      lowConfidence: true
    };
  }).filter(Boolean);
}

async function getOEmbed(url) {
  const response = await axios.get("https://open.spotify.com/oembed", {
    params: { url }
  });
  return response.data;
}

async function getCollectionViaEmbed(kind, id) {
  const spotifyUrl = `https://open.spotify.com/${kind}/${id}`;
  const oembed = await getOEmbed(spotifyUrl);
  const embedUrl = oembed.iframe_url || `https://open.spotify.com/embed/${kind}/${id}`;
  const response = await axios.get(embedUrl);
  const tracks = parseEmbedTracks(response.data, oembed.thumbnail_url || null);

  if (!tracks.length) throw spotifyCollectionUnavailableError(kind);

  logger.warn("Using Spotify embed fallback", { kind, id, tracks: tracks.length });
  return {
    name: oembed.title || `Spotify ${kind}`,
    total: tracks.length,
    tracks,
    lowConfidence: true,
    fallback: "embed"
  };
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
  const spotifyUrl = `https://open.spotify.com/track/${trackId}`;

  if (!hasCredentials()) {
    return getTrackViaOEmbed(spotifyUrl);
  }

  try {
    const track = await spotifyGet(`/tracks/${trackId}`);
    return toTrackMetadata(track);
  } catch (error) {
    if (isPremiumRequiredError(error) || isMissingCredentialsError(error)) return getTrackViaOEmbed(spotifyUrl);
    throw error;
  }
}

async function getTrackViaOEmbed(spotifyUrl) {
  const response = { data: await getOEmbed(spotifyUrl) };
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

async function getPlaylistTracks(playlistId) {
  if (!hasCredentials()) {
    return getCollectionViaEmbed("playlist", playlistId);
  }

  let data;
  try {
    data = await spotifyGet(`/playlists/${playlistId}`, {
      fields: "name,tracks(total,items(track(name,duration_ms,artists(name),album(name,images))))",
      limit: 100
    });
  } catch (error) {
    if (isPremiumRequiredError(error) || isMissingCredentialsError(error)) return getCollectionViaEmbed("playlist", playlistId);
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
  if (!hasCredentials()) {
    return getCollectionViaEmbed("album", albumId);
  }

  let album;
  try {
    album = await spotifyGet(`/albums/${albumId}`);
  } catch (error) {
    if (isPremiumRequiredError(error) || isMissingCredentialsError(error)) return getCollectionViaEmbed("album", albumId);
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
  if (!hasCredentials()) return null;

  const data = await spotifyGet("/search", { q: query, type: "track", limit: 1 });
  const track = data.tracks.items[0];
  return track ? toTrackMetadata(track) : null;
}

module.exports = {
  getAlbumTracks,
  getCollectionViaEmbed,
  getPlaylistTracks,
  getTrackMetadata,
  searchTrack
};
