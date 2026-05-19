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
