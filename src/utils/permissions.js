const { PermissionsBitField } = require("discord.js");
const { getSettings } = require("./serverSettings");

function isAdmin(member) {
  return Boolean(member?.permissions?.has(PermissionsBitField.Flags.Administrator));
}

function canManageSettings(member) {
  return Boolean(
    member?.permissions?.has(PermissionsBitField.Flags.Administrator)
    || member?.permissions?.has(PermissionsBitField.Flags.ManageGuild)
  );
}

function hasDjRole(member, roleId) {
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function canUseDjControl(interaction) {
  const settings = getSettings(interaction.guildId);
  if (!settings.djRoleId) return { ok: true, settings };
  if (isAdmin(interaction.member) || hasDjRole(interaction.member, settings.djRoleId)) {
    return { ok: true, settings };
  }

  return {
    ok: false,
    settings,
    message: `You need the <@&${settings.djRoleId}> DJ role to use this control.`
  };
}

function canSkipDirectly(interaction) {
  const settings = getSettings(interaction.guildId);
  if (isAdmin(interaction.member) || hasDjRole(interaction.member, settings.djRoleId)) {
    return { ok: true, settings };
  }

  return {
    ok: false,
    settings,
    message: settings.djRoleId
      ? `You need the <@&${settings.djRoleId}> DJ role to skip directly. Your skip was counted as a vote.`
      : "No DJ role is configured. Your skip was counted as a vote."
  };
}

module.exports = {
  canManageSettings,
  canSkipDirectly,
  canUseDjControl,
  hasDjRole,
  isAdmin
};
