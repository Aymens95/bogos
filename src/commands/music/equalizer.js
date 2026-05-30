const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const Equalizer = require("../../music/Equalizer");
const logger = require("../../utils/logger");
const { canUseDjControl } = require("../../utils/permissions");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("equalizer")
    .setDescription("Apply an audio filter")
    .addStringOption((option) => {
      const choices = Equalizer.getAllFilters().map((name) => ({ name, value: name }));
      return option
        .setName("filter")
        .setDescription("Audio filter")
        .setRequired(true)
        .addChoices(...choices);
    }),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) {
      await interaction.reply({ content: check.message, flags: 64 });
      return;
    }

    const permission = canUseDjControl(interaction);
    if (!permission.ok) {
      await interaction.reply({ content: permission.message, flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const filter = interaction.options.getString("filter", true);
      const applied = Equalizer.setFilter(interaction.guildId, filter);
      await client.player.restartCurrent(interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(`🎚️ Filter set to **${applied}**`);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Equalizer change failed", { guildId: interaction.guildId, error });
      await interaction.editReply("❌ Could not apply filter. Try again.");
    }
  }
};
