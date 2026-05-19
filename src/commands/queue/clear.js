const { SlashCommandBuilder } = require("discord.js");
const { canUseDjControl } = require("../../utils/permissions");
const { requireSameVoiceChannel } = require("../../utils/voiceChecks");

module.exports = {
  data: new SlashCommandBuilder().setName("clear").setDescription("Clear the entire queue"),
  async execute(interaction, client) {
    const check = requireSameVoiceChannel(interaction, client);
    if (!check.ok) return interaction.reply({ content: check.message, flags: 64 });
    const permission = canUseDjControl(interaction);
    if (!permission.ok) return interaction.reply({ content: permission.message, flags: 64 });
    await interaction.deferReply({ flags: 64 });
    client.player.getQueue(interaction.guildId).clear();
    client.player.clearSavedQueue(interaction.guildId);
    await client.player.updateNowPlaying(interaction.guildId).catch(() => {});
    await interaction.editReply("Queue cleared.");
  }
};
