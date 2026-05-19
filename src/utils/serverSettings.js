const { dataPath, readJSON, writeJSON } = require("./storage");
const { LOOP_MODES } = require("./constants");

const DEFAULT_SETTINGS = {
  djRoleId: null,
  defaultVolume: 50,
  defaultLoopMode: LOOP_MODES.OFF,
  autoplayDefault: false,
  maxQueueSize: 100,
  commandTextChannelId: null
};

function clampInteger(value, min, max, fallback) {
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function normalizeSettings(settings) {
  return {
    djRoleId: settings?.djRoleId || null,
    defaultVolume: clampInteger(settings?.defaultVolume, 1, 100, DEFAULT_SETTINGS.defaultVolume),
    defaultLoopMode: Object.values(LOOP_MODES).includes(settings?.defaultLoopMode) ? settings.defaultLoopMode : DEFAULT_SETTINGS.defaultLoopMode,
    autoplayDefault: Boolean(settings?.autoplayDefault),
    maxQueueSize: clampInteger(settings?.maxQueueSize, 1, 200, DEFAULT_SETTINGS.maxQueueSize),
    commandTextChannelId: settings?.commandTextChannelId || null
  };
}

function settingsPath(guildId) {
  return dataPath("settings", `${guildId}.json`);
}

function getSettings(guildId) {
  return normalizeSettings(readJSON(settingsPath(guildId), DEFAULT_SETTINGS));
}

function saveSettings(guildId, settings) {
  return writeJSON(settingsPath(guildId), normalizeSettings(settings));
}

function setDjRole(guildId, roleId) {
  const settings = getSettings(guildId);
  settings.djRoleId = roleId || null;
  return saveSettings(guildId, settings);
}

function updateSettings(guildId, changes) {
  return saveSettings(guildId, {
    ...getSettings(guildId),
    ...changes
  });
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  setDjRole,
  updateSettings
};
