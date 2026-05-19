const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { dataPath, readJSON, writeJSON } = require("../../utils/storage");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

const MAX_PLAYLISTS = 20;
const MAX_SONGS = 100;
const NAME_MAX_LENGTH = 32;

function filePath(guildId) {
  return dataPath("playlists", `${guildId}.json`);
}

function normalizeName(name) {
  return String(name || "").trim();
}

function findPlaylistKey(playlists, name) {
  const lower = name.toLowerCase();
  return Object.keys(playlists).find((key) => key.toLowerCase() === lower) || null;
}

function cleanSong(song) {
  return {
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    durationFormatted: song.durationFormatted,
    albumArt: song.albumArt,
    youtubeUrl: song.youtubeUrl,
    source: song.source,
    unresolved: song.unresolved,
    searchQuery: song.searchQuery
  };
}

async function confirm(interaction, prompt) {
  await interaction.followUp({ content: `${prompt}\nType \`confirm\` in this channel within 30 seconds.`, flags: 64 });

  try {
    const collected = await interaction.channel.awaitMessages({
      filter: (message) => message.author.id === interaction.user.id && message.content.toLowerCase() === "confirm",
      max: 1,
      time: 30000,
      errors: ["time"]
    });
    await collected.first()?.delete().catch(() => {});
    return true;
  } catch {
    await interaction.followUp({ content: "❌ Action cancelled.", flags: 64 });
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Manage saved server playlists")
    .addSubcommand((subcommand) => subcommand
      .setName("save")
      .setDescription("Save the current queue as a named playlist")
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setMaxLength(NAME_MAX_LENGTH).setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("load")
      .setDescription("Load a saved playlist into the queue")
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setMaxLength(NAME_MAX_LENGTH).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List saved playlists for this server"))
    .addSubcommand((subcommand) => subcommand
      .setName("delete")
      .setDescription("Delete a saved playlist")
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setMaxLength(NAME_MAX_LENGTH).setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("view")
      .setDescription("View songs in a saved playlist")
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setMaxLength(NAME_MAX_LENGTH).setRequired(true))),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const subcommand = interaction.options.getSubcommand();
    const playlists = readJSON(filePath(interaction.guildId), {});
    const name = normalizeName(interaction.options.getString("name") || "");

    if (name && name.length > NAME_MAX_LENGTH) {
      await interaction.editReply("❌ Playlist names must be 32 characters or fewer.");
      return;
    }

    if (subcommand === "save") {
      const queue = client.player.getQueue(interaction.guildId);
      const songs = queue.getAll().slice(0, MAX_SONGS).map(cleanSong);
      if (!songs.length) {
        await interaction.editReply("❌ There is no queue to save.");
        return;
      }

      const existingKey = findPlaylistKey(playlists, name);
      if (!existingKey && Object.keys(playlists).length >= MAX_PLAYLISTS) {
        await interaction.editReply("❌ This server has reached the 20 playlist limit.");
        return;
      }

      if (existingKey && !await confirm(interaction, `⚠️ A playlist named **${existingKey}** already exists. Overwrite it?`)) return;

      if (existingKey) delete playlists[existingKey];
      playlists[name] = songs;

      if (!writeJSON(filePath(interaction.guildId), playlists)) {
        await interaction.editReply("❌ Could not save data. Check file permissions.");
        return;
      }

      await interaction.editReply(`Saved **${name}** with ${songs.length} song(s).`);
      return;
    }

    if (subcommand === "load") {
      const check = requireVoiceChannel(interaction);
      if (!check.ok) {
        await interaction.editReply(check.message);
        return;
      }

      const key = findPlaylistKey(playlists, name);
      if (!key) {
        await interaction.editReply(`❌ No playlist named **${name}** found on this server.`);
        return;
      }

      const queue = client.player.getQueue(interaction.guildId);
      const room = Math.max(0, MAX_SONGS - queue.getAll().length);
      const songs = playlists[key].slice(0, room).map((song) => ({ ...song, requestedBy: interaction.user.username }));
      if (!songs.length) {
        await interaction.editReply("❌ Queue is already at the 100 song limit.");
        return;
      }

      const wasEmpty = !queue.getCurrent();
      queue.addMany(songs);
      client.player.saveQueue(interaction.guildId);
      if (wasEmpty) await client.player.play(interaction.guildId, check.voiceChannel, interaction.channel);
      else await client.player.updateNowPlaying(interaction.guildId).catch(() => {});

      await interaction.editReply(`Loaded ${songs.length} of ${playlists[key].length} song(s) from **${key}**.`);
      return;
    }

    if (subcommand === "list") {
      const entries = Object.entries(playlists);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Saved Playlists")
        .setDescription(entries.length ? entries.map(([key, songs]) => `**${key}** - ${songs.length} song(s)`).join("\n") : "No saved playlists.");
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const key = findPlaylistKey(playlists, name);
    if (!key) {
      await interaction.editReply(`❌ No playlist named **${name}** found on this server.`);
      return;
    }

    if (subcommand === "delete") {
      if (!await confirm(interaction, `⚠️ Are you sure you want to delete **${key}** (${playlists[key].length} songs)?`)) return;
      delete playlists[key];
      if (!writeJSON(filePath(interaction.guildId), playlists)) {
        await interaction.editReply("❌ Could not save data. Check file permissions.");
        return;
      }
      await interaction.editReply(`Deleted **${key}**.`);
      return;
    }

    if (subcommand === "view") {
      const songs = playlists[key];
      const lines = songs.slice(0, 25).map((song, index) => `${index + 1}. ${song.title} - ${song.artist || "Unknown"} (${song.durationFormatted || "0:00"})`);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(key)
        .setDescription(lines.join("\n") || "No songs saved.")
        .setFooter({ text: `${songs.length} song(s)` });
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
