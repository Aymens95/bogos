const { ChannelType, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration");
const { canManageSettings } = require("../../utils/permissions");
const { LOOP_MODES } = require("../../utils/constants");
const { getSettings, setDjRole, updateSettings } = require("../../utils/serverSettings");

function buildSettingsEmbed(settings) {
  const maxDuration = settings.maxSongDuration > 0 ? formatDuration(settings.maxSongDuration) : "No limit";
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Server Settings")
    .addFields(
      { name: "DJ role", value: settings.djRoleId ? `<@&${settings.djRoleId}>` : "Not configured", inline: true },
      { name: "Default volume", value: `${settings.defaultVolume}%`, inline: true },
      { name: "Default loop", value: settings.defaultLoopMode, inline: true },
      { name: "Autoplay default", value: settings.autoplayDefault ? "Enabled" : "Disabled", inline: true },
      { name: "Max queue size", value: String(settings.maxQueueSize), inline: true },
      { name: "Command text channel", value: settings.commandTextChannelId ? `<#${settings.commandTextChannelId}>` : "Not configured", inline: true },
      { name: "Request channel", value: settings.requestChannelId ? `<#${settings.requestChannelId}>` : "Not configured", inline: true },
      { name: "24/7 mode", value: settings.alwaysOn ? "Enabled" : "Disabled", inline: true },
      { name: "Loudnorm", value: settings.loudnorm ? "Enabled" : "Disabled", inline: true },
      { name: "Max song duration", value: maxDuration, inline: true }
    )
    .setTimestamp();
}

function applyCurrentQueueSettings(client, guildId, settings) {
  const queue = client.player.queues.get(guildId);
  if (!queue || queue.getAll().length) return;

  queue.volume = settings.defaultVolume;
  queue.loopMode = settings.defaultLoopMode;
  queue.autoplay = settings.autoplayDefault;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure Bogos server settings")
    .addSubcommand((subcommand) => subcommand
      .setName("view")
      .setDescription("Show current server settings"))
    .addSubcommand((subcommand) => subcommand
      .setName("dj-role")
      .setDescription("Set or clear the DJ role")
      .addRoleOption((option) => option
        .setName("role")
        .setDescription("Role that can use DJ controls; omit to clear")))
    .addSubcommand((subcommand) => subcommand
      .setName("defaults")
      .setDescription("Set playback defaults for new queues")
      .addIntegerOption((option) => option
        .setName("volume")
        .setDescription("Default volume from 1 to 100")
        .setMinValue(1)
        .setMaxValue(100))
      .addStringOption((option) => option
        .setName("loop")
        .setDescription("Default loop mode")
        .addChoices(
          { name: "Off", value: LOOP_MODES.OFF },
          { name: "Song", value: LOOP_MODES.SONG },
          { name: "Queue", value: LOOP_MODES.QUEUE }
        ))
      .addBooleanOption((option) => option
        .setName("autoplay")
        .setDescription("Whether new queues start with autoplay enabled")))
    .addSubcommand((subcommand) => subcommand
      .setName("max-queue")
      .setDescription("Set the server queue size limit")
      .addIntegerOption((option) => option
        .setName("size")
        .setDescription("Max queued songs from 1 to 200")
        .setMinValue(1)
        .setMaxValue(200)
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("text-channel")
      .setDescription("Set or clear the preferred command text channel")
      .addChannelOption((option) => option
        .setName("channel")
        .setDescription("Text channel for bot messages; omit to clear")
        .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((subcommand) => subcommand
      .setName("request-channel")
      .setDescription("Set or clear the song request channel (paste links to play)")
      .addChannelOption((option) => option
        .setName("channel")
        .setDescription("Text channel for song requests; omit to clear")
        .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((subcommand) => subcommand
      .setName("always-on")
      .setDescription("Keep the bot in the voice channel even when the queue is empty")
      .addBooleanOption((option) => option
        .setName("enabled")
        .setDescription("Enable or disable 24/7 mode")
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("loudnorm")
      .setDescription("Normalize all songs to the same perceived volume")
      .addBooleanOption((option) => option
        .setName("enabled")
        .setDescription("Enable or disable loudness normalization")
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName("max-song-duration")
      .setDescription("Block songs longer than a given duration (0 = no limit)")
      .addIntegerOption((option) => option
        .setName("minutes")
        .setDescription("Max duration in minutes, 0 to disable")
        .setMinValue(0)
        .setMaxValue(180)
        .setRequired(true))),
  async execute(interaction, client) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use /settings in a server.", flags: 64 });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "view") {
      const settings = getSettings(interaction.guildId);
      await interaction.reply({ embeds: [buildSettingsEmbed(settings)], flags: 64 });
      return;
    }

    if (!canManageSettings(interaction.member)) {
      await interaction.reply({ content: "You need Manage Server or Administrator to change settings.", flags: 64 });
      return;
    }

    let ok = false;
    let message = "Settings updated.";

    if (subcommand === "dj-role") {
      const role = interaction.options.getRole("role");
      ok = setDjRole(interaction.guildId, role?.id || null);
      message = role ? `DJ role set to ${role}.` : "DJ role cleared.";
    }

    if (subcommand === "defaults") {
      const current = getSettings(interaction.guildId);
      const next = {
        defaultVolume: interaction.options.getInteger("volume") ?? current.defaultVolume,
        defaultLoopMode: interaction.options.getString("loop") ?? current.defaultLoopMode,
        autoplayDefault: interaction.options.getBoolean("autoplay") ?? current.autoplayDefault
      };

      ok = updateSettings(interaction.guildId, next);
      applyCurrentQueueSettings(client, interaction.guildId, getSettings(interaction.guildId));
      message = "Playback defaults updated.";
    }

    if (subcommand === "max-queue") {
      const size = interaction.options.getInteger("size", true);
      ok = updateSettings(interaction.guildId, { maxQueueSize: size });
      message = `Max queue size set to ${size}.`;
    }

    if (subcommand === "text-channel") {
      const channel = interaction.options.getChannel("channel");
      ok = updateSettings(interaction.guildId, { commandTextChannelId: channel?.id || null });
      message = channel ? `Command text channel set to ${channel}.` : "Command text channel cleared.";
    }

    if (subcommand === "request-channel") {
      const channel = interaction.options.getChannel("channel");
      ok = updateSettings(interaction.guildId, { requestChannelId: channel?.id || null });
      message = channel ? `Song request channel set to ${channel}. Users can now paste links there directly.` : "Song request channel cleared.";
    }

    if (subcommand === "always-on") {
      const enabled = interaction.options.getBoolean("enabled", true);
      ok = updateSettings(interaction.guildId, { alwaysOn: enabled });
      message = enabled ? "24/7 mode enabled. Bot will stay in the voice channel when the queue ends." : "24/7 mode disabled.";
    }

    if (subcommand === "loudnorm") {
      const enabled = interaction.options.getBoolean("enabled", true);
      ok = updateSettings(interaction.guildId, { loudnorm: enabled });
      message = enabled ? "Loudness normalization enabled. All songs will play at a consistent volume." : "Loudness normalization disabled.";
    }

    if (subcommand === "max-song-duration") {
      const minutes = interaction.options.getInteger("minutes", true);
      ok = updateSettings(interaction.guildId, { maxSongDuration: minutes * 60 });
      message = minutes > 0 ? `Max song duration set to ${minutes} minute(s).` : "Max song duration limit removed.";
    }

    if (!ok) {
      await interaction.reply({ content: "Could not save settings. Check file permissions.", flags: 64 });
      return;
    }

    await interaction.reply({ content: message, flags: 64 });
  }
};
