const FILTERS = {
  Normal: null,
  "Bass Boost": "bass=g=10",
  Nightcore: "aresample=48000,asetrate=48000*1.25",
  Vaporwave: "aresample=48000,asetrate=48000*0.8",
  "8D Audio": "apulsator=hz=0.08",
  Soft: "lowpass=f=3000",
  "Treble Boost": "treble=g=10",
  Loud: "dynaudnorm=f=200",
  Pop: "equalizer=f=60:width_type=o:width=2:g=-2,equalizer=f=150:width_type=o:width=2:g=3,equalizer=f=400:width_type=o:width=2:g=1,equalizer=f=3000:width_type=o:width=2:g=3,equalizer=f=6000:width_type=o:width=2:g=3,equalizer=f=12000:width_type=o:width=2:g=2",
  Jazz: "equalizer=f=80:width_type=o:width=2:g=2,equalizer=f=400:width_type=o:width=2:g=-1,equalizer=f=1200:width_type=o:width=2:g=1,equalizer=f=8000:width_type=o:width=2:g=3",
  Metal: "equalizer=f=80:width_type=o:width=2:g=5,equalizer=f=3500:width_type=o:width=2:g=-4,equalizer=f=8000:width_type=o:width=2:g=5,equalizer=f=16000:width_type=o:width=2:g=4",
  Classical: "equalizer=f=32:width_type=o:width=2:g=3,equalizer=f=1000:width_type=o:width=2:g=-1,equalizer=f=8000:width_type=o:width=2:g=2,highpass=f=30",
  Echo: "aecho=0.8:0.9:1000:0.3",
  Karaoke: "pan=stereo|c0=c0-c1|c1=c1-c0"
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
