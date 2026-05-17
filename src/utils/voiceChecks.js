function getMemberVoiceChannel(interaction) {
  return interaction.member?.voice?.channel || null;
}

function requireVoiceChannel(interaction) {
  const voiceChannel = getMemberVoiceChannel(interaction);
  if (!voiceChannel) {
    return { ok: false, message: "You need to be in a voice channel first." };
  }

  return { ok: true, voiceChannel };
}

function requireSameVoiceChannel(interaction, client) {
  const voiceChannel = getMemberVoiceChannel(interaction);
  if (!voiceChannel) {
    return { ok: false, message: "You need to be in a voice channel first." };
  }

  const connection = client.player.connections.get(interaction.guildId);
  if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
    return { ok: false, message: "You need to be in my voice channel to use this control." };
  }

  return { ok: true, voiceChannel };
}

module.exports = {
  requireSameVoiceChannel,
  requireVoiceChannel
};
