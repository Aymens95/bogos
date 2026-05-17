const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Show the queue"),
  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    const queue = client.player.getQueue(interaction.guildId);
    queue.textChannel = interaction.channel;
    await client.player.updateNowPlaying(interaction.guildId);
    await interaction.editReply(`Queue has ${queue.getAll().length} song(s).`);
  }
};
