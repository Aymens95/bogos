const FILTERS = {
  Normal: null,
  "Bass Boost": "bass=g=10",
  Nightcore: "aresample=48000,asetrate=48000*1.25",
  Vaporwave: "aresample=48000,asetrate=48000*0.8",
  "8D Audio": "apulsator=hz=0.08",
  Soft: "lowpass=f=3000",
  "Treble Boost": "treble=g=10",
  Loud: "dynaudnorm=f=200"
};

const activeFilters = new Map();

function normalizeFilterName(filterName) {
  return Object.keys(FILTERS).find((name) => name.toLowerCase() === String(filterName).toLowerCase()) || "Normal";
}

function setFilter(guildId, filterName) {
  const normalized = normalizeFilterName(filterName);
  activeFilters.set(guildId, normalized);
  return normalized;
}

function getFilter(guildId) {
  return activeFilters.get(guildId) || "Normal";
}

function getFFmpegArgs(guildId) {
  return FILTERS[getFilter(guildId)];
}

function getAllFilters() {
  return Object.keys(FILTERS);
}

function reset(guildId) {
  activeFilters.delete(guildId);
}

module.exports = {
  getAllFilters,
  getFFmpegArgs,
  getFilter,
  reset,
  setFilter
};
