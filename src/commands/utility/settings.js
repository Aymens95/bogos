const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../../utils/permissions");
const { getSettings, setDjRole } = require("../../utils/serverSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure Bogos server settings")
    .addSubcommand((subcommand) => subcommand
      .setName("view")
      .setDescription("Show current server settings"))
    .addSubcommand((subcommand) => subcommand
      .setName("dj-role")
      .setDescription("Set or clear the DJ role")
      .addRoleOption((option) => option
        .setName("role")
        .setDescription("Role that can use DJ controls; omit to clear"))),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use /settings in a server.", flags: 64 });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "view") {
      const settings = getSettings(interaction.guildId);
      const djRole = settings.djRoleId ? `<@&${settings.djRoleId}>` : "Not configured";
      await interaction.reply({ content: `DJ role: ${djRole}`, flags: 64 });
      return;
    }

    if (!canManageSettings(interaction.member)) {
      await interaction.reply({ content: "You need Manage Server or Administrator to change settings.", flags: 64 });
      return;
    }

    const role = interaction.options.getRole("role");
    const ok = setDjRole(interaction.guildId, role?.id || null);
    if (!ok) {
      await interaction.reply({ content: "Could not save settings. Check file permissions.", flags: 64 });
      return;
    }

    await interaction.reply({
      content: role ? `DJ role set to ${role}.` : "DJ role cleared.",
      flags: 64
    });
  }
};
