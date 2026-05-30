const { getSettings } = require("./serverSettings");

function getQueueRoom(guildId, queue) {
  const maxQueueSize = getSettings(guildId).maxQueueSize;
  return {
    maxQueueSize,
    room: Math.max(0, maxQueueSize - queue.getAll().length)
  };
}

function takeQueueableSongs(guildId, queue, songs) {
  const { maxQueueSize, room } = getQueueRoom(guildId, queue);
  return {
    songs: songs.slice(0, room),
    maxQueueSize,
    room,
    truncated: songs.length > room
  };
}

module.exports = {
  getQueueRoom,
  takeQueueableSongs
};
