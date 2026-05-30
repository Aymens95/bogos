const { resolveInput } = require("../music/resolveInput");
const { buildAddedToQueueEmbed } = require("../utils/embedBuilder");
const { takeQueueableSongs } = require("../utils/queueLimits");
const { getSettings } = require("../utils/serverSettings");
const logger = require("../utils/logger");

async function sendTemp(channel, content, delayMs = 6000) {
  const msg = await channel.send(content).catch(() => null);
  if (msg) setTimeout(() => msg.delete().catch(() => {}), delayMs);
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guildId) return;

    const settings = getSettings(message.guildId);
    if (!settings.requestChannelId || message.channelId !== settings.requestChannelId) return;

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      await sendTemp(message.channel, `<@${message.author.id}> You need to be in a voice channel to request songs.`);
      message.delete().catch(() => {});
      return;
    }

    const query = message.content.trim();
    if (!query) return;

    message.delete().catch(() => {});

    try {
      const result = await resolveInput(query, message.author.username);
      const queue = client.player.getQueue(message.guildId);
      const wasEmpty = !queue.getCurrent();
      const queueable = takeQueueableSongs(message.guildId, queue, result.songs);

      if (!queueable.songs.length) {
        await sendTemp(message.channel, `<@${message.author.id}> The queue is full (${queueable.maxQueueSize} song limit).`);
        return;
      }

      result.songs = queueable.songs;
      result.truncated = result.truncated || queueable.truncated;
      queue.addMany(result.songs);
      client.player.saveQueue(message.guildId);

      await message.channel.send({
        embeds: [buildAddedToQueueEmbed({ query, result, user: message.author })]
      });

      if (wasEmpty) {
        await client.player.play(message.guildId, voiceChannel, message.channel);
      } else {
        client.player.cancelDisconnectTimer(message.guildId);
        await client.player.updateNowPlaying(message.guildId).catch(() => {});
      }
    } catch (error) {
      logger.warn("Song request channel resolve failed", { guildId: message.guildId, query, error: error.message });
      await sendTemp(message.channel, `<@${message.author.id}> Could not find that song. Try a different query.`);
    }
  }
};
