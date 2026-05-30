const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("invite").setDescription("Get the bot invite link"),
  async execute(interaction, client) {
    const permissions = PermissionFlagsBits.Connect | PermissionFlagsBits.Speak | PermissionFlagsBits.SendMessages | PermissionFlagsBits.UseApplicationCommands;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=${permissions}&scope=bot%20applications.commands`;
    await interaction.reply({ content: url, flags: 64 });
  }
};
