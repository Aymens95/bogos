const { SlashCommandBuilder } = require("discord.js");
const { canUseDjControl } = require("../../utils/permissions");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set playback volume")
    .addIntegerOption((option) => option
      .setName("level")
      .setDescription("Volume from 1 to 100")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true)),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    const permission = canUseDjControl(interaction);
    if (!permission.ok) return interaction.reply({ content: permission.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const level = interaction.options.getInteger("level", true);
    await client.player.setVolume(interaction.guildId, level);
    await interaction.editReply(`Volume set to ${level}%.`);
  }
};
