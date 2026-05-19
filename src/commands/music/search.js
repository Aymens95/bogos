const { SlashCommandBuilder } = require("discord.js");
const ytdlp = require("../../music/ytdlp");
const { setPendingSearch } = require("../../handlers/selectHandler");
const { buildSearchResultsPayload } = require("../../utils/embedBuilder");
const { formatDuration } = require("../../utils/formatDuration");
const { requireVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search YouTube and choose which result to queue")
    .addStringOption((option) => option
      .setName("query")
      .setDescription("Song name or YouTube search terms")
      .setRequired(true)),
  async execute(interaction) {
    const voiceCheck = requireVoiceChannel(interaction);
    if (!voiceCheck.ok) {
      await interaction.reply({ content: voiceCheck.message, flags: 64 });
      return;
    }

    await interaction.deferReply();

    const query = interaction.options.getString("query", true);
    const candidates = (await ytdlp.getYouTubeCandidates(query, 5)).map((candidate) => ({
      ...candidate,
      durationFormatted: formatDuration(candidate.duration)
    }));

    if (!candidates.length) {
      await interaction.editReply("No YouTube results found.");
      return;
    }

    const reply = await interaction.editReply(buildSearchResultsPayload({
      query,
      candidates,
      userId: interaction.user.id
    }));

    setPendingSearch(reply.id, candidates);
  }
};
