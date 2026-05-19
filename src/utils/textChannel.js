const { getSettings } = require("./serverSettings");

function getPreferredTextChannel(interaction) {
  const channelId = getSettings(interaction.guildId).commandTextChannelId;
  if (!channelId) return interaction.channel;

  return interaction.guild?.channels?.cache?.get(channelId) || interaction.channel;
}

module.exports = {
  getPreferredTextChannel
};
