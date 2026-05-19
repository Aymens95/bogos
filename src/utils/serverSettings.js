const { dataPath, readJSON, writeJSON } = require("./storage");

const DEFAULT_SETTINGS = {
  djRoleId: null
};

function settingsPath(guildId) {
  return dataPath("settings", `${guildId}.json`);
}

function getSettings(guildId) {
  return {
    ...DEFAULT_SETTINGS,
    ...readJSON(settingsPath(guildId), DEFAULT_SETTINGS)
  };
}

function saveSettings(guildId, settings) {
  return writeJSON(settingsPath(guildId), {
    ...DEFAULT_SETTINGS,
    ...settings
  });
}

function setDjRole(guildId, roleId) {
  const settings = getSettings(guildId);
  settings.djRoleId = roleId || null;
  return saveSettings(guildId, settings);
}

module.exports = {
  getSettings,
  setDjRole
};
