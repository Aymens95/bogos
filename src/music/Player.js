const { createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerStatus, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const { spawn } = require("node:child_process");
const Equalizer = require("./Equalizer");
const { MusicQueue } = require("./MusicQueue");
const ytdlp = require("./ytdlp");
const { LOOP_MODES } = require("../utils/constants");
const { setDisconnectTimer, clearDisconnectTimer } = require("../utils/disconnectTimer");
const { buildNowPlayingPayload } = require("../utils/embedBuilder");

async function safeDeleteMessage(message) {
  if (!message) return;

  try {
    await message.delete();
  } catch (error) {
    // Message may already have been deleted manually.
    console.warn(`Could not delete message ${message.id}:`, error.message);
  }
}

async function deleteRecentNowPlayingEmbeds(queue, client) {
  if (!queue.textChannel || !client.user) return;

  try {
    const messages = await queue.textChannel.messages.fetch({ limit: 25 });
    const staleMessages = messages.filter((message) => {
      if (message.author.id !== client.user.id) return false;
      const embed = message.embeds[0];
      if (!embed) return false;

      return embed.title === "Nothing playing"
        || embed.fields?.some((field) => field.name === "Autoplay")
        || message.components.length > 0;
    });

    for (const message of staleMessages.values()) {
      await safeDeleteMessage(message);
    }
  } catch (error) {
    console.warn("Could not scan for stale Now Playing embeds:", error.message);
  }
}

class Player {
  constructor(client) {
    this.client = client;
    this.queues = new Map();
    this.players = new Map();
    this.connections = new Map();
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) this.queues.set(guildId, new MusicQueue());
    return this.queues.get(guildId);
  }

  getAudioPlayer(guildId) {
    if (this.players.has(guildId)) return this.players.get(guildId);

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });

    player.on(AudioPlayerStatus.Idle, () => {
      this.handleSongEnd(guildId).catch((error) => console.error("Song end handler failed:", error));
    });

    player.on("error", (error) => {
      console.error(`Audio player error in guild ${guildId}:`, error);
      this.handleSongEnd(guildId).catch(() => {});
    });

    this.players.set(guildId, player);
    return player;
  }

  async connect(guildId, voiceChannel) {
    const existing = getVoiceConnection(guildId);
    if (existing) return existing;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
      } catch {
        this.disconnect(guildId).catch((error) => console.error("Disconnect cleanup failed:", error));
      }
    });

    this.connections.set(guildId, connection);
    connection.subscribe(this.getAudioPlayer(guildId));
    return connection;
  }

  async play(guildId, voiceChannel, textChannel = null) {
    const queue = this.getQueue(guildId);
    if (textChannel) queue.textChannel = textChannel;
    this.cancelDisconnectTimer(guildId);

    await this.connect(guildId, voiceChannel);
    await this.playCurrent(guildId);
  }

  async playCurrent(guildId, seekSeconds = 0) {
    const queue = this.getQueue(guildId);
    const song = queue.getCurrent();
    if (!song) {
      await this.startDisconnectTimer(guildId, "Queue ended.");
      return;
    }

    const audioUrl = await ytdlp.getAudioUrl(song.youtubeUrl);
    const audioFilters = [];
    const equalizerFilter = Equalizer.getFFmpegArgs(guildId);
    if (equalizerFilter) audioFilters.push(equalizerFilter);
    if (queue.volume !== 100) audioFilters.push(`volume=${queue.volume / 100}`);

    const ffmpegArgs = [
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      ...(seekSeconds > 0 ? ["-ss", String(seekSeconds)] : []),
      "-i", audioUrl,
      "-analyzeduration", "0",
      "-loglevel", "0",
      ...(audioFilters.length ? ["-af", audioFilters.join(",")] : []),
      "-c:a", "libopus",
      "-f", "ogg",
      "-ar", "48000",
      "-ac", "2",
      "pipe:1"
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, { windowsHide: true });

    ffmpeg.on("error", (error) => console.error("FFmpeg failed:", error));

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.OggOpus
    });

    queue.paused = false;
    queue.seekOffset = seekSeconds;
    queue.startedAt = Date.now();
    this.getAudioPlayer(guildId).play(resource);
    await this.updateNowPlaying(guildId);
  }

  async updateNowPlaying(guildId, page = 1, disabled = false, userId = null) {
    const queue = this.getQueue(guildId);
    const payload = buildNowPlayingPayload(queue, disabled, page, guildId, userId);

    if (queue.nowPlayingMessage) {
      await queue.nowPlayingMessage.edit(payload).catch(() => {
        queue.nowPlayingMessage = null;
      });
    }

    if (!queue.nowPlayingMessage && queue.textChannel) {
      queue.nowPlayingMessage = await queue.textChannel.send(payload);
    }
  }

  async handleSongEnd(guildId) {
    const queue = this.getQueue(guildId);
    const nextIndex = queue.advance();

    if (nextIndex === null) {
      await this.startDisconnectTimer(guildId, "Queue ended.");
      return;
    }

    await this.playCurrent(guildId);
  }

  pause(guildId) {
    const queue = this.getQueue(guildId);
    queue.paused = true;
    this.getAudioPlayer(guildId).pause();
    return this.updateNowPlaying(guildId);
  }

  resume(guildId) {
    const queue = this.getQueue(guildId);
    queue.paused = false;
    this.cancelDisconnectTimer(guildId);
    this.getAudioPlayer(guildId).unpause();
    return this.updateNowPlaying(guildId);
  }

  async skip(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.advance() === null) {
      await this.startDisconnectTimer(guildId, "Queue ended.");
      return;
    }
    await this.playCurrent(guildId);
  }

  async previous(guildId) {
    const queue = this.getQueue(guildId);
    const previous = queue.history.pop();
    if (!previous) return false;

    queue.songs.splice(queue.currentIndex, 0, previous);
    queue.currentIndex = queue.songs.indexOf(previous);
    await this.playCurrent(guildId);
    return true;
  }

  async stop(guildId) {
    const queue = this.getQueue(guildId);
    queue.clear();
    this.getAudioPlayer(guildId).stop(true);
    await this.startDisconnectTimer(guildId, "Playback stopped.");
  }

  setVolume(guildId, level) {
    const queue = this.getQueue(guildId);
    queue.volume = Math.max(1, Math.min(100, level));
    const elapsed = queue.startedAt ? Math.floor((Date.now() - queue.startedAt) / 1000) : 0;
    return this.playCurrent(guildId, (queue.seekOffset || 0) + elapsed);
  }

  restartCurrent(guildId) {
    return this.playCurrent(guildId, 0);
  }

  async seek(guildId, seconds, relative = false) {
    const queue = this.getQueue(guildId);
    const song = queue.getCurrent();
    if (!song) return;

    const elapsed = queue.startedAt ? Math.floor((Date.now() - queue.startedAt) / 1000) : 0;
    const currentPosition = (queue.seekOffset || 0) + elapsed;
    const target = relative ? currentPosition + seconds : seconds;
    const bounded = Math.max(0, Math.min(song.duration || Number.MAX_SAFE_INTEGER, target));

    await this.playCurrent(guildId, bounded);
  }

  setLoop(guildId, mode) {
    const queue = this.getQueue(guildId);
    queue.loopMode = Object.values(LOOP_MODES).includes(mode) ? mode : LOOP_MODES.OFF;
    return this.updateNowPlaying(guildId);
  }

  toggleAutoplay(guildId) {
    const queue = this.getQueue(guildId);
    queue.autoplay = !queue.autoplay;
    return this.updateNowPlaying(guildId);
  }

  async startDisconnectTimer(guildId, reason) {
    const queue = this.getQueue(guildId);
    if (queue.paused) return;

    if (queue.textChannel && !queue.disconnectMessage) {
      queue.disconnectMessage = await queue.textChannel.send(`👋 ${reason} Disconnecting in 5 seconds...`).catch(() => null);
    }

    await this.updateNowPlaying(guildId, 1, true).catch(() => {});

    setDisconnectTimer(guildId, () => {
      this.disconnect(guildId).catch((error) => console.error("Disconnect cleanup failed:", error));
    });
  }

  cancelDisconnectTimer(guildId) {
    const queue = this.getQueue(guildId);
    clearDisconnectTimer(guildId);
    if (queue.disconnectMessage) {
      queue.disconnectMessage.delete().catch(() => {});
      queue.disconnectMessage = null;
    }
  }

  async disconnect(guildId) {
    const queue = this.getQueue(guildId);
    clearDisconnectTimer(guildId);

    const player = this.players.get(guildId);
    player?.stop(true);
    this.players.delete(guildId);

    const connection = getVoiceConnection(guildId) || this.connections.get(guildId);
    connection?.destroy();
    this.connections.delete(guildId);
    Equalizer.reset(guildId);

    await safeDeleteMessage(queue.nowPlayingMessage);
    queue.nowPlayingMessage = null;
    await deleteRecentNowPlayingEmbeds(queue, this.client);

    await safeDeleteMessage(queue.disconnectMessage);
    queue.disconnectMessage = null;

    this.queues.delete(guildId);
  }
}

module.exports = {
  Player
};
