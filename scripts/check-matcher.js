const assert = require("node:assert/strict");
const { selectBestCandidate, normalizeTitle } = require("../src/music/matcher");

assert.equal(normalizeTitle("Song Title (Official Video)"), "song title");

const track = {
  title: "Midnight City",
  artist: "M83",
  duration: 244
};

const best = selectBestCandidate(track, [
  { title: "Midnight City trailer", artist: "Movie Clips", duration: 90, url: "bad" },
  { title: "M83 - Midnight City Official Audio", artist: "M83", duration: 244, url: "good" },
  { title: "Midnight City karaoke", artist: "Karaoke Channel", duration: 244, url: "karaoke" }
]);

assert.equal(best.url, "good");

const liveTrack = {
  title: "Alive Live",
  artist: "Daft Punk",
  duration: 300
};

const liveBest = selectBestCandidate(liveTrack, [
  { title: "Daft Punk Alive Live", artist: "Daft Punk", duration: 300, url: "live" },
  { title: "Daft Punk Alive reaction", artist: "Reaction Channel", duration: 300, url: "reaction" }
]);

assert.equal(liveBest.url, "live");

const durationSensitiveTrack = {
  title: "Blinding Lights",
  artist: "The Weeknd",
  duration: 200
};

const durationSensitiveBest = selectBestCandidate(durationSensitiveTrack, [
  { title: "The Weeknd - Blinding Lights (Official Video)", artist: "The Weeknd", duration: 263, url: "video" },
  { title: "The Weeknd - Blinding Lights (Official Audio)", artist: "The Weeknd", duration: 203, url: "audio" },
  { title: "The Weeknd - Blinding Lights (Lyrics)", artist: "7clouds", duration: 199, url: "lyrics" }
]);

assert.equal(durationSensitiveBest.url, "audio");

const sceneTrapTrack = {
  title: "Running Up That Hill",
  artist: "Kate Bush",
  duration: 298
};

const sceneTrapBest = selectBestCandidate(sceneTrapTrack, [
  { title: "Kate Bush - Running Up That Hill - Official Music Video", artist: "KateBushMusic", duration: 296, url: "official" },
  { title: "Max's Song Full Scene Kate Bush Running Up That Hill Stranger Things", artist: "Netflix", duration: 250, url: "scene" },
  { title: "Kate Bush - Running Up That Hill Lyrics", artist: "Lyrics Channel", duration: 293, url: "lyrics" }
]);

assert.equal(sceneTrapBest.url, "official");
