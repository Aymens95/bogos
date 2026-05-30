const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const Lyrics = require("../../music/Lyrics");
const logger = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Find lyrics for the current song or a search query")
    .addStringOption((option) => option
      .setName("query")
      .setDescription("Song title and artist; defaults to the current song")),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const query = interaction.options.getString("query");
    const queue = client.player.getQueue(interaction.guildId);
    const song = queue.getCurrent();

    if (!query && !song) {
      await interaction.editReply("Nothing is playing. Try `/lyrics query:<song and artist>`.");
      return;
    }

    try {
      const result = await Lyrics.findLyrics({ query, song });
      if (!result) {
        await interaction.editReply("No lyrics found.");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x1db954)
        .setTitle(`${result.title} - ${result.artist}`.slice(0, 256))
        .setDescription(result.lyrics)
        .setFooter({
          text: result.truncated
            ? "Lyrics from LRCLIB. Truncated to fit Discord."
            : "Lyrics from LRCLIB."
        })
        .setTimestamp();

      if (result.album) {
        embed.addFields({ name: "Album", value: result.album.slice(0, 1024), inline: false });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.warn("Lyrics lookup failed", { guildId: interaction.guildId, error: error.message });
      await interaction.editReply("Lyrics lookup failed. Try again later.");
    }
  }
};
