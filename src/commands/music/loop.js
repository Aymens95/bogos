const { SlashCommandBuilder } = require("discord.js");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set loop mode")
    .addStringOption((option) => option
      .setName("mode")
      .setDescription("Loop mode")
      .setRequired(true)
      .addChoices(
        { name: "Off", value: "off" },
        { name: "Song", value: "song" },
        { name: "Queue", value: "queue" }
      )),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const mode = interaction.options.getString("mode", true);
    await client.player.setLoop(interaction.guildId, mode);
    await interaction.editReply(`Loop mode set to ${mode}.`);
  }
};
