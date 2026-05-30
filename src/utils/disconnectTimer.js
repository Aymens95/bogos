const timers = new Map();

function setDisconnectTimer(guildId, callback, delayMs = 5000) {
  clearDisconnectTimer(guildId);
  const timeout = setTimeout(() => {
    timers.delete(guildId);
    callback();
  }, delayMs);

  timers.set(guildId, timeout);
  return timeout;
}

function clearDisconnectTimer(guildId) {
  const timeout = timers.get(guildId);
  if (!timeout) return false;

  clearTimeout(timeout);
  timers.delete(guildId);
  return true;
}

module.exports = {
  clearDisconnectTimer,
  setDisconnectTimer
};
