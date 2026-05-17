const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const Favorites = require("../../music/Favorites");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

function buildFavoritesEmbed(user, songs, page = 1) {
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(songs.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageSongs = songs.slice(start, start + pageSize);
  const lines = pageSongs.map((song, index) => {
    const added = song.addedAt ? `<t:${Math.floor(new Date(song.addedAt).getTime() / 1000)}:d>` : "Unknown date";
    return `${start + index + 1}. **${song.title}** - ${song.artist || "Unknown"} (${song.durationFormatted || "0:00"}) • ${added}`;
  });

  return new EmbedBuilder()
    .setColor(0xff77aa)
    .setTitle(`${user.username}'s Favorites`)
    .setDescription(lines.join("\n") || "No favorites yet.")
    .setFooter({ text: `Page ${safePage} of ${totalPages} • ${songs.length} song(s)` });
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
    .setName("favorites")
    .setDescription("Manage your favorite songs")
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("View your favorites"))
    .addSubcommand((subcommand) => subcommand.setName("play").setDescription("Add all your favorites to the queue"))
    .addSubcommand((subcommand) => subcommand
      .setName("remove")
      .setDescription("Remove a favorite by position")
      .addIntegerOption((option) => option.setName("position").setDescription("Favorite position").setMinValue(1).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("clear").setDescription("Clear all favorites")),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const subcommand = interaction.options.getSubcommand();
    const songs = Favorites.readFavorites(interaction.user.id);

    if (subcommand === "list") {
      await interaction.editReply({ embeds: [buildFavoritesEmbed(interaction.user, songs)] });
      return;
    }

    if (subcommand === "play") {
      const check = requireVoiceChannel(interaction);
      if (!check.ok) {
        await interaction.editReply(check.message);
        return;
      }

      if (!songs.length) {
        await interaction.editReply("❌ You do not have any favorites yet.");
        return;
      }

      const queue = client.player.getQueue(interaction.guildId);
      const room = Math.max(0, 100 - queue.getAll().length);
      const toQueue = songs.slice(0, room).map((song) => ({ ...song, requestedBy: interaction.user.username }));

      if (!toQueue.length) {
        await interaction.editReply("❌ Queue is already at the 100 song limit.");
        return;
      }

      const wasEmpty = !queue.getCurrent();
      queue.addMany(toQueue);
      if (wasEmpty) await client.player.play(interaction.guildId, check.voiceChannel, interaction.channel);
      else await client.player.updateNowPlaying(interaction.guildId).catch(() => {});

      await interaction.editReply(`Queued ${toQueue.length} favorite song(s).`);
      return;
    }

    if (subcommand === "remove") {
      const position = interaction.options.getInteger("position", true) - 1;
      if (position < 0 || position >= songs.length) {
        await interaction.editReply("❌ No favorite at that position.");
        return;
      }

      const [removed] = songs.splice(position, 1);
      if (!Favorites.writeFavorites(interaction.user.id, songs)) {
        await interaction.editReply("❌ Could not save data. Check file permissions.");
        return;
      }

      await interaction.editReply(`Removed **${removed.title}** from your favorites.`);
      return;
    }

    if (subcommand === "clear") {
      if (!songs.length) {
        await interaction.editReply("❌ You do not have any favorites yet.");
        return;
      }

      if (!await confirm(interaction, `⚠️ Clear all ${songs.length} favorite song(s)?`)) return;

      if (!Favorites.writeFavorites(interaction.user.id, [])) {
        await interaction.editReply("❌ Could not save data. Check file permissions.");
        return;
      }

      await interaction.editReply("Cleared your favorites.");
    }
  }
};
