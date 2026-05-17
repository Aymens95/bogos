function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function parseTimestamp(value) {
  if (!value) return null;

  const parts = String(value).split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  return null;
}

module.exports = {
  formatDuration,
  parseTimestamp
};
