const { getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const guildId = oldState.guild.id;
    const connection = getVoiceConnection(guildId);
    if (!connection) return;

    const channelId = connection.joinConfig.channelId;
    const oldChannel = oldState.guild.channels.cache.get(channelId);
    if (!oldChannel || oldState.channelId !== channelId && newState.channelId !== channelId) return;

    const nonBotMembers = oldChannel.members.filter((member) => !member.user.bot);

    if (nonBotMembers.size === 0) {
      await client.player.startDisconnectTimer(guildId, "Everyone left the voice channel.");
    } else {
      client.player.cancelDisconnectTimer(guildId);
    }
  }
};
