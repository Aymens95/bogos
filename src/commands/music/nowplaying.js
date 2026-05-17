const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the Now Playing embed"),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    const queue = client.player.getQueue(interaction.guildId);
    queue.textChannel = interaction.channel;
    await client.player.updateNowPlaying(interaction.guildId);
    await interaction.editReply("Now Playing updated.");
  }
};
