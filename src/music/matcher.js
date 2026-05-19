const AVOID_KEYWORDS = [
  "trailer",
  "movie",
  "reaction",
  "karaoke",
  "instrumental",
  "cover",
  "shorts"
];

const SOFT_AVOID_KEYWORDS = [
  "lyrics",
  "lyric",
  "live",
  "remix"
];

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/official|video|audio|visualizer|hd|hq|explicit/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizeTitle(value)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenScore(expected, actual) {
  const expectedTokens = tokens(expected);
  if (!expectedTokens.length) return 0;

  const actualTokens = new Set(tokens(actual));
  const matches = expectedTokens.filter((token) => actualTokens.has(token)).length;
  return matches / expectedTokens.length;
}

function hasKeyword(value, keyword) {
  return new RegExp(`\\b${keyword}\\b`, "i").test(value || "");
}

function durationScore(trackDuration, candidateDuration) {
  if (!trackDuration || !candidateDuration) return 0;

  const difference = Math.abs(Number(trackDuration) - Number(candidateDuration));
  if (difference <= 5) return 25;
  if (difference <= 15) return 15;
  if (difference <= 30) return 5;
  if (difference >= 90) return -20;
  return -5;
}

function scoreYouTubeCandidate(track, candidate) {
  const candidateText = `${candidate.title || ""} ${candidate.artist || ""}`;
  const queryText = `${track.title || ""} ${track.artist || ""}`;
  let score = 0;

  score += tokenScore(track.title, candidate.title) * 55;
  score += tokenScore(track.artist, candidateText) * 30;
  score += tokenScore(queryText, candidateText) * 15;
  score += durationScore(track.duration, candidate.duration);

  for (const keyword of AVOID_KEYWORDS) {
    if (hasKeyword(candidateText, keyword) && !hasKeyword(queryText, keyword)) score -= 35;
  }

  for (const keyword of SOFT_AVOID_KEYWORDS) {
    if (hasKeyword(candidateText, keyword) && !hasKeyword(queryText, keyword)) score -= 12;
  }

  if (/official audio|official video/i.test(candidateText)) score += 8;
  if (/topic\b/i.test(candidate.artist || "")) score += 5;

  return Math.round(score);
}

function selectBestCandidate(track, candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;

  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreYouTubeCandidate(track, candidate)
    }))
    .sort((a, b) => b.score - a.score)[0] || null;
}

module.exports = {
  normalizeTitle,
  scoreYouTubeCandidate,
  selectBestCandidate
};
