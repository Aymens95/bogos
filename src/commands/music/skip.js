const { SlashCommandBuilder } = require("discord.js");
const { requestSkip } = require("../../utils/skipControl");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip to the next song"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const message = await requestSkip(interaction, client, check.voiceChannel);
    await interaction.editReply(message);
  }
};
